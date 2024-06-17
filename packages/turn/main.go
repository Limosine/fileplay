package main

import (
	"crypto/tls"
	"flag"
	"log"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/pion/logging"
	"github.com/pion/turn/v3"
)

func main() {
	port := flag.Int("port", 3478, "Listening port.")
	tlsPort := flag.Int("tls-port", 5349, "TLS listening port.")
	minPort := flag.Uint("min-port", 49152, "Lower bound of UDP relay endpoints.")
	maxPort := flag.Uint("max-port", 50175, "Upper bound of UDP relay endpoints.")
	authSecret := flag.String("auth-secret", "", "Shared secret for the Long Term Credential Mechanism.")
	realm := flag.String("realm", "fileplay.me", "Realm (defaults to \"fileplay.me\")")
	certFile := flag.String("cert", "", "Certificate file in PEM format.")
	keyFile := flag.String("key", "", "Private key file in PEM format.")
	flag.Parse()

	if len(*authSecret) == 0 {
		log.Fatalf("'auth-secret' is required")
	}

	cer, err := tls.LoadX509KeyPair(*certFile, *keyFile)
	if err != nil {
		log.Println(err)
		return
	}

	// Create TCP listener
	tcpListener, err := net.Listen("tcp4", "0.0.0.0:"+strconv.Itoa(*port))
	if err != nil {
		log.Panicf("Failed to create TURN server listener: %s", err)
	}

	// Create TLS listener
	tlsListener, err := tls.Listen("tcp4", "0.0.0.0:"+strconv.Itoa(*tlsPort), &tls.Config{
		MinVersion:   tls.VersionTLS12,
		Certificates: []tls.Certificate{cer},
	})
	if err != nil {
		log.Panicf("Failed to create TURN server listener: %s", err)
	}

	// Create UDP listener
	udpListener, err := net.ListenPacket("udp4", "0.0.0.0:"+strconv.Itoa(*port))
	if err != nil {
		log.Panicf("Failed to create TURN server listener: %s", err)
	}

	logger := logging.NewDefaultLeveledLoggerForScope("lt-creds", logging.LogLevelTrace, os.Stdout)

	relayAddressGenerator := &RelayAddressGeneratorPortRangeDynamic{
		MinPort: uint16(*minPort),
		MaxPort: uint16(*maxPort),
		Address: "0.0.0.0",
	}

	s, err := turn.NewServer(turn.ServerConfig{
		Realm: *realm,
		// Set AuthHandler callback
		AuthHandler: turn.NewLongTermAuthHandler(*authSecret, logger),
		// List of TCP and TLS Listeners
		ListenerConfigs: []turn.ListenerConfig{
			{
				Listener:              tcpListener,
				RelayAddressGenerator: relayAddressGenerator,
			},
			{
				Listener:              tlsListener,
				RelayAddressGenerator: relayAddressGenerator,
			},
		},
		// List of UDP Listeners
		PacketConnConfigs: []turn.PacketConnConfig{
			{
				PacketConn:            udpListener,
				RelayAddressGenerator: relayAddressGenerator,
			},
		},
	})
	if err != nil {
		log.Panic(err)
	}

	// Block until user sends SIGINT or SIGTERM
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	<-sigs

	if err = s.Close(); err != nil {
		log.Panic(err)
	}
}
