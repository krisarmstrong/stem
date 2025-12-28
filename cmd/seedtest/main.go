// Seed Test Suite - Unified Network Testing Tool
// Part of The Seed ecosystem by Mustard Seed Networks
//
// Usage:
//   seedtest reflect --interface eth0       # Reflector mode (Tier 1)
//   seedtest test --type throughput         # Test Master mode (Tier 2)
//   seedtest web --port 8080                # WebUI
//   seedtest tui                            # Terminal UI

package main

import (
	"flag"
	"fmt"
	"os"
)

const (
	Version     = "3.0.0-dev"
	ProductName = "Seed Test Suite"
	Company     = "Mustard Seed Networks"
)

func main() {
	// Main command parsing
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "reflect":
		reflectCmd(os.Args[2:])
	case "test":
		testCmd(os.Args[2:])
	case "web":
		webCmd(os.Args[2:])
	case "tui":
		tuiCmd(os.Args[2:])
	case "version", "--version", "-v":
		printVersion()
	case "help", "--help", "-h":
		printUsage()
	default:
		fmt.Printf("Unknown command: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func printVersion() {
	fmt.Printf("%s v%s\n", ProductName, Version)
	fmt.Printf("Copyright (c) 2024 %s\n", Company)
	fmt.Println("Part of The Seed ecosystem")
}

func printUsage() {
	fmt.Printf(`%s v%s
%s - Part of The Seed ecosystem

USAGE:
    seedtest <command> [options]

COMMANDS:
    reflect     Start packet reflector (Tier 1 license)
    test        Run network tests (Tier 2 license required)
    web         Start WebUI server
    tui         Start terminal UI dashboard
    version     Show version information
    help        Show this help message

REFLECT OPTIONS:
    --interface, -i    Network interface to use
    --profile          Preset profile (netally, msn, all, custom)
    --port             UDP port filter (default: any)
    --oui              OUI filter for MAC addresses

TEST OPTIONS:
    --interface, -i    Network interface to use
    --type, -t         Test type (throughput, latency, frame_loss, etc.)
    --duration, -d     Test duration in seconds
    --frame-sizes      Comma-separated frame sizes

WEB OPTIONS:
    --port, -p         HTTP port (default: 8080)
    --host             Bind address (default: 0.0.0.0)

EXAMPLES:
    seedtest reflect -i eth0 --profile netally
    seedtest test -i eth0 -t throughput -d 60
    seedtest web -p 8080
    seedtest tui

For more information, visit: https://mustardseednetworks.com
`, ProductName, Version, Company)
}

func reflectCmd(args []string) {
	fs := flag.NewFlagSet("reflect", flag.ExitOnError)
	iface := fs.String("interface", "", "Network interface")
	fs.StringVar(iface, "i", "", "Network interface (shorthand)")
	profile := fs.String("profile", "all", "Preset profile")
	port := fs.Int("port", 0, "UDP port filter")
	oui := fs.String("oui", "", "OUI filter")

	if err := fs.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if *iface == "" {
		fmt.Println("Error: --interface is required")
		fs.Usage()
		os.Exit(1)
	}

	fmt.Printf("Starting Seed Reflector on %s (profile: %s)\n", *iface, *profile)
	if *port > 0 {
		fmt.Printf("Port filter: %d\n", *port)
	}
	if *oui != "" {
		fmt.Printf("OUI filter: %s\n", *oui)
	}

	// TODO: Start reflector
	fmt.Println("Reflector not yet implemented in unified binary")
}

func testCmd(args []string) {
	fs := flag.NewFlagSet("test", flag.ExitOnError)
	iface := fs.String("interface", "", "Network interface")
	fs.StringVar(iface, "i", "", "Network interface (shorthand)")
	testType := fs.String("type", "throughput", "Test type")
	fs.StringVar(testType, "t", "throughput", "Test type (shorthand)")
	duration := fs.Int("duration", 60, "Test duration in seconds")
	fs.IntVar(duration, "d", 60, "Test duration (shorthand)")
	frameSizes := fs.String("frame-sizes", "64,128,256,512,1024,1280,1518", "Frame sizes")

	if err := fs.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if *iface == "" {
		fmt.Println("Error: --interface is required")
		fs.Usage()
		os.Exit(1)
	}

	fmt.Printf("Starting Seed Test: %s on %s\n", *testType, *iface)
	fmt.Printf("Duration: %d seconds\n", *duration)
	fmt.Printf("Frame sizes: %s\n", *frameSizes)

	// TODO: Start test
	fmt.Println("Tests not yet implemented in unified binary")
}

func webCmd(args []string) {
	fs := flag.NewFlagSet("web", flag.ExitOnError)
	port := fs.Int("port", 8080, "HTTP port")
	fs.IntVar(port, "p", 8080, "HTTP port (shorthand)")
	host := fs.String("host", "0.0.0.0", "Bind address")

	if err := fs.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Starting Seed WebUI at http://%s:%d\n", *host, *port)

	// TODO: Start web server
	fmt.Println("WebUI not yet implemented in unified binary")
}

func tuiCmd(args []string) {
	fmt.Println("Starting Seed TUI Dashboard...")

	// TODO: Start TUI
	fmt.Println("TUI not yet implemented in unified binary")
}
