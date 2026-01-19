package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Error responses
func errorResponse(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func internalError(c *gin.Context, err error) {
	errorResponse(c, http.StatusInternalServerError, err.Error())
}

func badRequest(c *gin.Context, err error) {
	errorResponse(c, http.StatusBadRequest, err.Error())
}

func notFound(c *gin.Context, resource string) {
	errorResponse(c, http.StatusNotFound, resource+" not found")
}

func conflict(c *gin.Context, message string) {
	errorResponse(c, http.StatusConflict, message)
}

// handleError checks for common error patterns and sends appropriate response
// Returns true if an error was handled, false if no error
func handleError(c *gin.Context, err error, notFoundCheck bool) bool {
	if err == nil {
		return false
	}
	if notFoundCheck && strings.Contains(err.Error(), "not found") {
		notFound(c, "resource")
		return true
	}
	internalError(c, err)
	return true
}

// Success responses
func ok(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// okList sends a list response, ensuring nil slices become empty arrays
// Use this for list endpoints to avoid returning null in JSON
func okList[T any](c *gin.Context, data []T) {
	if data == nil {
		data = []T{}
	}
	c.JSON(http.StatusOK, data)
}

func created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, data)
}

func accepted(c *gin.Context, message string) {
	c.JSON(http.StatusAccepted, gin.H{"message": message})
}

func noContent(c *gin.Context) {
	c.JSON(http.StatusNoContent, nil)
}

func message(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, gin.H{"message": msg})
}
