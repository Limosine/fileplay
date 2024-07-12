package main

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/pion/randutil"
	"github.com/pion/transport/v3"
	"github.com/pion/transport/v3/stdnet"
)

type RelayAddressGeneratorPortRangeDynamic struct {
	// Initial relay address (will be updated)
	RelayAddress net.IP
	LastUpdated  int64

	// MinPort the minimum port to allocate
	MinPort uint16
	// MaxPort the maximum (inclusive) port to allocate
	MaxPort uint16

	// MaxRetries the amount of tries to allocate a random port in the defined range
	MaxRetries int

	// Rand the random source of numbers
	Rand randutil.MathRandomGenerator

	// Address is passed to Listen/ListenPacket when creating the Relay
	Address string

	Net transport.Net
}

// Update IP address
func (r *RelayAddressGeneratorPortRangeDynamic) updateIPAddress() net.IP {
	fallback := net.ParseIP("127.0.0.1")

	resp, err := http.Get("https://api.ipify.org")
	if err != nil {
		return fallback
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fallback
	}

	r.LastUpdated = time.Now().Unix()

	r.RelayAddress = net.ParseIP(string(bodyBytes))
	return r.RelayAddress
}

// Get current IP address and update if outdated
func (r *RelayAddressGeneratorPortRangeDynamic) getIPAddress() net.IP {
	now := time.Now().Unix()

	if (now - r.LastUpdated) > 300 {
		return r.updateIPAddress()
	} else {
		return r.RelayAddress
	}
}

// Validate is called on server startup and confirms the RelayAddressGenerator is properly configured
func (r *RelayAddressGeneratorPortRangeDynamic) Validate() error {
	if r.Net == nil {
		var err error
		r.Net, err = stdnet.NewNet()
		if err != nil {
			return fmt.Errorf("failed to create network: %w", err)
		}
	}

	if r.Rand == nil {
		r.Rand = randutil.NewMathRandomGenerator()
	}

	if r.MaxRetries == 0 {
		r.MaxRetries = 10
	}

	r.updateIPAddress()

	switch {
	case r.MinPort == 0:
		return errMinPortNotZero
	case r.MaxPort == 0:
		return errMaxPortNotZero
	case r.Address == "":
		return errListeningAddressInvalid
	default:
		return nil
	}
}

// AllocatePacketConn generates a new PacketConn to receive traffic on and the IP/Port to populate the allocation response with
func (r *RelayAddressGeneratorPortRangeDynamic) AllocatePacketConn(network string, requestedPort int) (net.PacketConn, net.Addr, error) {
	relayAddress := r.getIPAddress()

	if requestedPort != 0 {
		conn, err := r.Net.ListenPacket(network, fmt.Sprintf("%s:%d", r.Address, requestedPort))
		if err != nil {
			return nil, nil, err
		}
		relayAddr, ok := conn.LocalAddr().(*net.UDPAddr)
		if !ok {
			return nil, nil, errNilConn
		}

		relayAddr.IP = relayAddress
		return conn, relayAddr, nil
	}

	for try := 0; try < r.MaxRetries; try++ {
		port := r.MinPort + uint16(r.Rand.Intn(int((r.MaxPort+1)-r.MinPort)))
		conn, err := r.Net.ListenPacket(network, fmt.Sprintf("%s:%d", r.Address, port))
		if err != nil {
			continue
		}

		relayAddr, ok := conn.LocalAddr().(*net.UDPAddr)
		if !ok {
			return nil, nil, errNilConn
		}

		relayAddr.IP = relayAddress
		return conn, relayAddr, nil
	}

	return nil, nil, errMaxRetriesExceeded
}

// AllocateConn generates a new Conn to receive traffic on and the IP/Port to populate the allocation response with
func (r *RelayAddressGeneratorPortRangeDynamic) AllocateConn(string, int) (net.Conn, net.Addr, error) {
	return nil, nil, errTODO
}
