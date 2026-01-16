package utils

import "strings"

// NormalizeMac converts MAC to lowercase colon-separated format
func NormalizeMac(mac string) string {
	mac = strings.ToLower(mac)
	mac = strings.ReplaceAll(mac, "-", ":")
	return mac
}
