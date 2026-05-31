package main

import (
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"os"
)

type Creds struct {
	PrivateKey string `json:"private_key"`
}

func main() {
	data, err := os.ReadFile("scraper/google-credentials.json")
	if err != nil {
		fmt.Printf("Read error: %v\n", err)
		return
	}
	var c Creds
	if err := json.Unmarshal(data, &c); err != nil {
		fmt.Printf("Unmarshal error: %v\n", err)
		return
	}
	block, _ := pem.Decode([]byte(c.PrivateKey))
	if block == nil {
		fmt.Println("Decode failed")
		return
	}
	_, err = x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		fmt.Printf("Parse error: %v\n", err)
	} else {
		fmt.Println("Parse success!")
	}
}
