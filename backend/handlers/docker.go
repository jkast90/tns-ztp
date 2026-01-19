package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

type DockerHandler struct {
	client      *client.Client
	networkName string
	imageName   string
}

type TestContainer struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Hostname  string `json:"hostname"`
	MAC       string `json:"mac"`
	IP        string `json:"ip"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type SpawnRequest struct {
	Hostname     string `json:"hostname"`
	MAC          string `json:"mac"`
	VendorClass  string `json:"vendor_class"`  // DHCP Option 60 vendor class identifier
	ConfigMethod string `json:"config_method"` // Config fetch method: tftp, http, or both
}

func NewDockerHandler() (*DockerHandler, error) {
	// Use API version 1.44 which is the minimum required by Docker 26+
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithVersion("1.44"))
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	// Network name is docker-compose project name + network name
	// Default assumes "ztp-server" project with "ztp-net" network
	networkName := os.Getenv("DOCKER_NETWORK")
	if networkName == "" {
		networkName = "ztp-server_ztp-net"
	}

	imageName := os.Getenv("TEST_CLIENT_IMAGE")
	if imageName == "" {
		imageName = "ztp-server-test-client"
	}

	return &DockerHandler{
		client:      cli,
		networkName: networkName,
		imageName:   imageName,
	}, nil
}

func (h *DockerHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/docker/containers", h.List)
	r.POST("/docker/containers", h.Spawn)
	r.DELETE("/docker/containers/:id", h.Remove)
}

// generateMAC generates a random MAC address with the locally administered bit set
func generateMAC() string {
	mac := make([]byte, 6)
	rand.Read(mac)
	// Set the locally administered bit (bit 1 of first byte)
	mac[0] = (mac[0] | 0x02) & 0xfe
	return fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5])
}

// List returns all test containers
func (h *DockerHandler) List(c *gin.Context) {
	ctx := context.Background()

	// Filter containers by label
	containers, err := h.client.ContainerList(ctx, types.ContainerListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", "ztp-test-client=true"),
		),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to list containers: %v", err)})
		return
	}

	result := make([]TestContainer, 0, len(containers))
	for _, ctr := range containers {
		// Get container details for MAC address
		inspect, err := h.client.ContainerInspect(ctx, ctr.ID)
		if err != nil {
			continue
		}

		mac := ""
		ip := ""
		if netSettings, ok := inspect.NetworkSettings.Networks[h.networkName]; ok {
			mac = netSettings.MacAddress
			ip = netSettings.IPAddress
		}

		name := ""
		if len(ctr.Names) > 0 {
			name = strings.TrimPrefix(ctr.Names[0], "/")
		}

		hostname := inspect.Config.Hostname

		result = append(result, TestContainer{
			ID:        ctr.ID[:12],
			Name:      name,
			Hostname:  hostname,
			MAC:       mac,
			IP:        ip,
			Status:    ctr.State,
			CreatedAt: time.Unix(ctr.Created, 0).Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, result)
}

// Spawn creates a new test container
func (h *DockerHandler) Spawn(c *gin.Context) {
	var req SpawnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Hostname = ""
	}

	ctx := context.Background()

	// Generate unique identifiers
	mac := req.MAC
	if mac == "" {
		mac = generateMAC()
	}
	timestamp := time.Now().Unix()
	hostname := req.Hostname
	if hostname == "" {
		hostname = fmt.Sprintf("test-device-%d", timestamp)
	}
	containerName := fmt.Sprintf("ztp-test-%d", timestamp)

	// Create container config with environment variables for DHCP options
	env := []string{
		fmt.Sprintf("DEVICE_HOSTNAME=%s", hostname),
	}
	if req.VendorClass != "" {
		env = append(env, fmt.Sprintf("VENDOR_CLASS=%s", req.VendorClass))
	}
	if req.ConfigMethod != "" {
		env = append(env, fmt.Sprintf("CONFIG_METHOD=%s", req.ConfigMethod))
	}

	config := &container.Config{
		Image:    h.imageName,
		Hostname: hostname,
		Env:      env,
		Labels: map[string]string{
			"ztp-test-client": "true",
		},
	}

	// Host config with NET_ADMIN capability
	hostConfig := &container.HostConfig{
		CapAdd: []string{"NET_ADMIN"},
	}

	// Network config - connect to ztp-net
	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: map[string]*network.EndpointSettings{
			h.networkName: {
				MacAddress: mac,
			},
		},
	}

	// Create the container
	resp, err := h.client.ContainerCreate(ctx, config, hostConfig, networkConfig, nil, containerName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create container: %v", err)})
		return
	}

	// Start the container
	if err := h.client.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		// Clean up the created container if start fails
		h.client.ContainerRemove(ctx, resp.ID, types.ContainerRemoveOptions{Force: true})
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to start container: %v", err)})
		return
	}

	// Get container info after start to get the assigned IP
	inspect, err := h.client.ContainerInspect(ctx, resp.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to inspect container: %v", err)})
		return
	}

	ip := ""
	if netSettings, ok := inspect.NetworkSettings.Networks[h.networkName]; ok {
		ip = netSettings.IPAddress
	}

	c.JSON(http.StatusCreated, TestContainer{
		ID:        resp.ID[:12],
		Name:      containerName,
		Hostname:  hostname,
		MAC:       mac,
		IP:        ip,
		Status:    "running",
		CreatedAt: time.Now().Format(time.RFC3339),
	})
}

// Remove stops and removes a test container
func (h *DockerHandler) Remove(c *gin.Context) {
	id := c.Param("id")
	ctx := context.Background()

	// Stop the container first (with timeout)
	timeout := 5
	stopOptions := container.StopOptions{Timeout: &timeout}
	h.client.ContainerStop(ctx, id, stopOptions)

	// Remove the container
	if err := h.client.ContainerRemove(ctx, id, types.ContainerRemoveOptions{Force: true}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to remove container: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Container removed"})
}
