package ws

import (
	"encoding/json"
	"log"
	"sync"
)

// EventType represents the type of WebSocket event
type EventType string

const (
	EventDeviceDiscovered EventType = "device_discovered"
	EventDeviceOnline     EventType = "device_online"
	EventDeviceOffline    EventType = "device_offline"
	EventBackupStarted    EventType = "backup_started"
	EventBackupCompleted  EventType = "backup_completed"
	EventBackupFailed     EventType = "backup_failed"
	EventConfigPulled     EventType = "config_pulled"
)

// Event represents a WebSocket event message
type Event struct {
	Type    EventType   `json:"type"`
	Payload interface{} `json:"payload"`
}

// DeviceDiscoveredPayload is the payload for device discovery events
type DeviceDiscoveredPayload struct {
	MAC      string `json:"mac"`
	IP       string `json:"ip"`
	Hostname string `json:"hostname,omitempty"`
	Vendor   string `json:"vendor,omitempty"`
}

// ConfigPulledPayload is the payload for config pull events (TFTP/HTTP)
type ConfigPulledPayload struct {
	MAC      string `json:"mac"`
	IP       string `json:"ip"`
	Hostname string `json:"hostname,omitempty"`
	Filename string `json:"filename"`
	Protocol string `json:"protocol"` // "tftp" or "http"
}

// Hub manages WebSocket connections and broadcasts events
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client connected. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Client's buffer is full, close the connection
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastEvent sends an event to all connected clients
func (h *Hub) BroadcastEvent(event Event) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling WebSocket event: %v", err)
		return
	}

	h.mu.RLock()
	clientCount := len(h.clients)
	h.mu.RUnlock()

	if clientCount > 0 {
		h.broadcast <- data
		log.Printf("Broadcasting event %s to %d clients", event.Type, clientCount)
	}
}

// BroadcastDeviceDiscovered sends a device discovered event
func (h *Hub) BroadcastDeviceDiscovered(mac, ip, hostname, vendor string) {
	h.BroadcastEvent(Event{
		Type: EventDeviceDiscovered,
		Payload: DeviceDiscoveredPayload{
			MAC:      mac,
			IP:       ip,
			Hostname: hostname,
			Vendor:   vendor,
		},
	})
}

// BroadcastConfigPulled sends a config pulled event (TFTP/HTTP file request)
func (h *Hub) BroadcastConfigPulled(mac, ip, hostname, filename, protocol string) {
	h.BroadcastEvent(Event{
		Type: EventConfigPulled,
		Payload: ConfigPulledPayload{
			MAC:      mac,
			IP:       ip,
			Hostname: hostname,
			Filename: filename,
			Protocol: protocol,
		},
	})
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
