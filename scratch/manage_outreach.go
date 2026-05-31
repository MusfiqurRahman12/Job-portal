package main

import (
	"bufio"
	"fmt"
	"job-portal-crawler/scraper"
	"log"
	"net/smtp"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("📬 Starting AI Outreach Queue Manager...")

	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := scraper.NewDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	smtpUser := strings.TrimSpace(os.Getenv("ALERT_EMAIL"))
	smtpPass := strings.TrimSpace(os.Getenv("ALERT_EMAIL_PASSWORD"))

	drafts, err := db.GetPendingOutreachDrafts()
	if err != nil {
		log.Fatalf("Failed to fetch pending drafts: %v", err)
	}

	if len(drafts) == 0 {
		fmt.Println("✨ No pending outreach drafts found in the database. Run generate_outreach first!")
		return
	}

	fmt.Printf("Found %d pending outreach drafts.\n", len(drafts))
	reader := bufio.NewReader(os.Stdin)

	for i, d := range drafts {
		fmt.Println("\n==================================================")
		fmt.Printf("Draft [%d/%d] for Company: %s\n", i+1, len(drafts), d.Company)
		fmt.Println("==================================================")
		
		for {
			fmt.Printf("Recipient : %s\n", d.ContactEmail)
			fmt.Printf("Subject   : %s\n", d.EmailSubject)
			fmt.Println("--------------------------------------------------")
			fmt.Println(d.EmailBody)
			fmt.Println("--------------------------------------------------")
			fmt.Print("Options: [a] Approve & Send, [r] Reject, [e] Edit, [s] Skip, [q] Quit: ")

			choice, _ := reader.ReadString('\n')
			choice = strings.ToLower(strings.TrimSpace(choice))

			if choice == "q" {
				fmt.Println("👋 Exiting Outreach Queue Manager.")
				return
			}

			if choice == "s" {
				fmt.Println("Skipping draft.")
				break
			}

			if choice == "r" {
				err := db.UpdateOutreachStatus(d.ID, "rejected")
				if err != nil {
					fmt.Printf("❌ Failed to reject draft: %v\n", err)
				} else {
					fmt.Println("🗑️ Draft rejected.")
				}
				break
			}

			if choice == "e" {
				fmt.Println("\n--- EDIT MODE ---")
				fmt.Printf("Enter new Recipient [%s]: ", d.ContactEmail)
				newEmail, _ := reader.ReadString('\n')
				newEmail = strings.TrimSpace(newEmail)
				if newEmail != "" {
					d.ContactEmail = newEmail
				}

				fmt.Printf("Enter new Subject [%s]: ", d.EmailSubject)
				newSubject, _ := reader.ReadString('\n')
				newSubject = strings.TrimSpace(newSubject)
				if newSubject != "" {
					d.EmailSubject = newSubject
				}

				fmt.Println("Enter new Body (type 'DONE' on a new line when finished):")
				var bodyLines []string
				for {
					line, _ := reader.ReadString('\n')
					lineClean := strings.TrimRight(line, "\r\n")
					if lineClean == "DONE" {
						break
					}
					bodyLines = append(bodyLines, lineClean)
				}
				if len(bodyLines) > 0 {
					d.EmailBody = strings.Join(bodyLines, "\n")
				}
				fmt.Println("\n--- DRAFT UPDATED ---")
				continue // redisplay updated draft
			}

			if choice == "a" {
				if smtpUser == "" || smtpPass == "" {
					fmt.Println("❌ ALERT_EMAIL and ALERT_EMAIL_PASSWORD are not set in your .env. Cannot send email.")
					fmt.Println("Please set them, or [e] edit, [r] reject, or [s] skip.")
					continue
				}

				fmt.Printf("Sending email to %s via SMTP...", d.ContactEmail)
				err := sendOutreachEmail(smtpUser, smtpPass, d.ContactEmail, d.EmailSubject, d.EmailBody)
				if err != nil {
					fmt.Printf("\n❌ Failed to send email: %v\n", err)
				} else {
					fmt.Println("\n✅ Email successfully sent!")
					err = db.UpdateOutreachStatus(d.ID, "sent")
					if err != nil {
						fmt.Printf("⚠️ Warning: Failed to update DB status to 'sent': %v\n", err)
					}
				}
				break
			}

			fmt.Println("Invalid option. Please choose a, r, e, s, or q.")
		}
	}

	fmt.Println("\n🎉 Processed all drafts in the queue!")
}

func sendOutreachEmail(smtpUser, smtpPass, toEmail, subject, body string) error {
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	// Compose RFC 822 email message
	msg := fmt.Sprintf("From: FutureTalent <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/plain; charset=UTF-8\r\n\r\n"+
		"%s\r\n", smtpUser, toEmail, subject, body)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{toEmail}, []byte(msg))
	return err
}
