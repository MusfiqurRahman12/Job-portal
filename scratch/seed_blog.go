package main

import (
	"database/sql"
	"fmt"
	"job-portal-crawler/scraper"
	"job-portal-crawler/shared"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	log.Println("🌱 Starting FutureTalent blog database seeding...")

	// Load env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Open raw SQL connection for clearing old articles
	rawDb, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open connection: %v", err)
	}
	defer rawDb.Close()

	_, err = rawDb.Exec("DELETE FROM news WHERE author = 'FutureTalent Editorial'")
	if err != nil {
		log.Fatalf("Failed to clear old articles: %v", err)
	}

	db, err := scraper.NewDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	articles := []shared.News{
		{
			Title:    "The Art of the Silent Career Pivot: How Sarah Swapped Spreadsheets for Wireframes",
			Slug:     "the-art-of-the-silent-career-pivot-how-sarah-swapped-spreadsheets-for-wireframes",
			Excerpt:  "Thinking of changing careers but terrified of starting from scratch? Sarah shares her journey of transitioning from financial spreadsheets to UX design—without losing her sanity or her paycheck.",
			Category: "Career",
			Image:    "/images/career-pivot.png",
			Author:   "FutureTalent Editorial",
			URL:      "/about",
			Content: `## The Invisible Wall of Finance

Six years. That’s how long Sarah Jenkins spent tracking depreciation schedules, preparing quarterly tax reconciliations, and correcting cell errors in Excel. She was good at it—precise, dependable, and quietly bored out of her mind. 

"I remember staring at a pivot table on a rainy Tuesday," Sarah recalls. "It hit me that if I did this for another ten years, I would look back at my life and feel absolutely nothing. But I couldn't just quit. I had a mortgage, a dog, and a lifestyle that required a steady paycheck."

Many career change guides tell you to burn the boats: quit your job, enroll in a $15,000 coding bootcamp, and trust the universe. But for 90% of working professionals, that’s not courage—it’s financial suicide. 

Sarah chose a different path: the **Silent Career Pivot**. She transitioned from senior accountant to UX/UI designer over a ten-month period, without taking a single day off work or sacrificing her income. Here is the exact playbook she used.

---

## Step 1: Mapping the "Invisible" Skills

Sarah's first mistake was assuming she was starting from zero. "I looked at job postings for junior product designers and panicked," she says. "They wanted Figma, Framer, prototyping, user flows... I didn't know any of that."

But when she analyzed *why* design teams existed, she realized something: **UX design is about solving business problems through structured interfaces.** 

As an accountant, Sarah was already doing complex data classification, auditing user frustration with accounting software, and designing logic flows for internal reports. She mapped these transferable skills:
- **Financial Audits** became **UX Competitor Analysis** (assessing structures and finding errors).
- **Client Expense Reports** became **User Personas** (categorizing behaviors and needs).
- **Excel Logic Formulas** became **Interaction Design Logic** (conditional logic paths).

> **The Takeaway:** You are never starting from scratch. Write down your daily tasks, strip away the industry-specific jargon, and find the core cognitive skill underneath. That is your bridge.

---

## Step 2: The Stealth Portfolio (No Clones Allowed)

Next came the learning phase. Sarah spent two hours every evening studying design fundamentals. But she quickly realized that certificates didn't land interviews—**proof of work** did.

"I saw dozens of portfolios with the same generic redesign of Spotify or Airbnb," Sarah says. "Hiring managers see those in their sleep. I needed something real."

Instead of hypothetical exercises, she looked at the tools she used every day. Her finance firm used an outdated internal database that everyone hated. She quietly spent three weeks redesigned the tool's interface to streamline the data entry flow. 

She didn't ask for permission. She simply designed a sleek, intuitive Figma prototype, recorded a 5-minute Loom video explaining the usability improvements, and showed it to her manager. 

Not only did her manager love it and ask the IT team to implement the layout, but Sarah now had a **real-world corporate case study** with measurable business impact: reducing data entry time by 18%.

---

## Step 3: Controlling the Narrative

When Sarah began applying, she didn't hide her accounting background. She weaponized it.

"On my resume, I didn't frame myself as a 'former accountant trying to do design,'" she explains. "I branded myself as a **'Data-Driven UX Designer with a background in Corporate Finance.'**"

This subtle shift changed everything. Design teams are full of creative thinkers, but they often struggle to calculate ROI or speak the language of executives. Sarah could walk into an interview and explain exactly how her design choices would impact customer retention and the bottom line. 

---

## The Verdict

Ten months after her pivot table epiphany, Sarah accepted a remote role as a Product Designer at a high-growth fintech startup. Her starting salary was 12% higher than her finance salary.

"The silent pivot is exhausting," Sarah admits. "There were nights I wanted to throw my laptop out the window. But doing it systematically gave me the safety net I needed to be brave. If you're stuck in a career that feels like a slow-motion mistake, stop waiting for the 'perfect time.' The perfect time is tonight, in the quiet hours after your day job is done."`,
			PublishedAt: time.Now().Add(-48 * time.Hour),
		},
		{
			Title:    "Cracking the Virtual Handshake: What Remote Interviewers Actually Look For",
			Slug:     "cracking-the-virtual-handshake-what-remote-interviewers-actually-look-for",
			Excerpt:  "Marcus kept failing remote coding interviews despite writing bug-free code. Here is the communication shift that finally landed him his senior developer role.",
			Category: "Career",
			Image:    "/images/remote-interview.png",
			Author:   "FutureTalent Editorial",
			URL:      "/about",
			Content: `## The Ghost in the Machine

Marcus Chen had a problem. He was a brilliant backend engineer with a resume that should have had recruiters fighting over him. He had optimized database pipelines, managed migrations for millions of users, and wrote clean, modular Go code. 

Yet, for three months, he kept getting the same automated email: *"Thank you for your time, but we’ve decided to move forward with other candidates."*

"I was losing my mind," Marcus says. "I was passing the technical take-home tests easily. I would write clean code, handle edge cases, and submit it on time. But once I got to the live Zoom interview stage, the energy would die. I was being ghosted, and I didn't know why."

Marcus assumed he was failing because his technical answers weren't complex enough. So, he spent hours memorizing obscure algorithms. 

The real issue had nothing to do with code. It was his **virtual handshake**.

---

## The Asynchronous Filter

In a remote job, your camera, microphone, and communication habits are your entire professional identity. When a manager interviews you on video, they aren't just evaluating your skills; they are testing a hypothesis: **"Would I enjoy working with this person asynchronously every single day?"**

Through self-recording and soliciting feedback from a career coach, Marcus identified three critical flaws in his remote presentation:

### 1. The Silent Genius Trap
During coding assessments, Marcus would go completely silent. He would stare at the screen, frown, and type furiously for six minutes without saying a word. 
* **The Fix:** Treat the coding assessment like a pair-programming session. Verbalize your thoughts. Say: *"I’m thinking of using a hash map here to get O(1) lookups, but the trade-off is memory. Let me write out the basic structure first, and we can optimize it."* This shows collaborative capability, not just isolated intellect.

### 2. Technical Friction as a Metaphor
Marcus had a cheap built-in laptop microphone that made him sound like he was speaking from inside a submarine. His lighting was behind him, leaving his face in dark shadow. 
* **The Fix:** To a remote manager, bad audio and lighting suggest a lack of respect for the remote medium. Marcus invested in a $45 USB microphone and a cheap ring light. Instantly, his presence went from "amateur hobbyist" to "polished remote professional."

### 3. The Lack of Interactive Documenting
In remote environments, documentation is king. In his subsequent interviews, Marcus started doing something unusual: he would open a shared document *before* writing code to outline his assumptions, assumptions, inputs, and expected outputs. 

---

## Changing the Strategy

"The shift was night and day," Marcus notes. "In my next interview, instead of rushing to type, I spent the first five minutes drawing a simple architecture flow on a digital whiteboard, explaining my design trade-offs to the interviewer. I checked in with them: *'Does this approach align with your system requirements?'*"

By transforming the interview from a cold interrogation into an interactive engineering meeting, Marcus broke down the digital barrier. 

Three weeks later, he accepted a Senior Backend Developer role at a fully distributed team in Europe. 

---

## A Checklist for Your Next Zoom Call

Before you join your next remote interview, run through this non-technical checklist:
- **Audio Quality:** Test your mic using a tool like Zoom's audio tester. High-quality sound reduces cognitive fatigue for the interviewer.
- **Eye Contact:** Look at your camera, not the interviewer's face on the screen. It creates the illusion of direct eye contact.
- **Narrate the Silences:** If you need thirty seconds to think, explicitly state it: *"I’m going to take a moment to look at this array structure before I write it out."*
- **Asynchronous Proof:** Mention how you document your work. Explain how you use tools like Slack, Linear, or GitHub issues to keep cross-timezone teams updated without meetings.`,
			PublishedAt: time.Now().Add(-24 * time.Hour),
		},
		{
			Title:    "Imposter Syndrome & The Self-Taught Dev: Building a Portfolio That Speaks Louder Than a Degree",
			Slug:     "imposter-syndrome-and-the-self-taught-developer-building-a-portfolio-that-speaks-louder-than-a-degree",
			Excerpt:  "Self-taught web developer Elena couldn't bypass the automated HR filters. By shifting from tutorial clones to solving real-world local business problems, she changed her career overnight.",
			Category: "Career",
			Image:    "/images/self-taught-portfolio.png",
			Author:   "FutureTalent Editorial",
			URL:      "/about",
			Content: `## The Resume Black Hole

Elena Rostova had submitted 242 applications in ninety days. The result? 238 automated rejections, three recruiter calls that went nowhere, and one coding challenge she completed but never heard back from. 

Elena was self-taught. She had spent a year learning HTML, CSS, JavaScript, and React in the bedroom of her apartment. 

"I was trapped in what I call the self-taught loop," Elena says. "You build a portfolio of projects, apply to junior roles, get rejected because you don't have a Computer Science degree or two years of experience, feel like an imposter, study more, and then repeat. It felt like trying to break into a bank with a plastic key."

Elena’s portfolio was filled with standard bootcamp projects: a calculator, a weather app, and a clone of Netflix. 

"I realized that if I were a hiring manager looking at twenty junior resumes a day, and every single one had the same Netflix clone, I’d throw them all in the trash too," she says. "I needed a portfolio that proved I could solve real commercial problems, not just copy a tutorial."

---

## The Local Business Experiment

One afternoon, Elena was ordering bread from a local bakery down the street. Their website was slow, failed to load on her mobile phone, and the checkout form was broken.

She saw her opportunity. 

She walked into the bakery the next day and asked to speak to the owner, a man named Tomas. "I told him: *'I’m a local developer building my portfolio. Your website is losing mobile customers. I will rebuild it for free using modern web technology. You only pay for the hosting.'*"

Tomas was skeptical but agreed. Over the next three weeks, Elena didn't just write code; she acted as a full-stack consultant:
1. She migrated their legacy site to Next.js.
2. She optimized their image assets to decrease load time from 7.4 seconds to 1.1 seconds.
3. She built a streamlined, responsive ordering form.

---

## The Case Study That Changed Everything

When the site launched, she didn't just add a link to her portfolio. She wrote a detailed **Technical Case Study**.

She structured it like a professional engineering report:
- **The Problem:** The bakery's website load speed was causing a 40% bounce rate on mobile devices, impacting digital bread orders.
- **The Solution:** Built a lightweight static site using React, caching images on a global CDN, and designing an accessible checkout form.
- **The Tech Stack:** Next.js, Tailwind CSS, Vercel, and Formspree.
- **The Result:** Mobile load speeds improved by 85%, and digital order inquiries increased by 22% in the first month.

She replaced her "Netflix Clone" on her resume with **\"Lead Frontend Engineer — Local Commerce Redesign (Case Study)\"**.

---

## Breaking the Filter

Two weeks after updating her portfolio, Elena applied for a remote Frontend Engineer position. 

The engineering manager didn't ask her about her lack of a college degree. Instead, during the interview, he pulled up her case study. "He told me it was the first time in months he had seen a junior developer explain *why* they chose a framework based on performance metrics rather than just 'following a tutorial,'" she says.

She got the job.

---

## How to Build Your Own Commercial Portfolio

If you are a self-taught developer struggling to get noticed, stop building mock applications. Try this three-step blueprint:
- **Find a Real Problem:** Look at local small businesses, non-profits, or open-source libraries. Find a website that is slow, ugly, or functionally broken.
- **Offer a Free Upgrade:** Reach out to the owner. Offer to fix it for free in exchange for using it as a case study and getting a testimonial.
- **Write the Performance Story:** Don't just show the code. Explain the business problem, the technical trade-offs you made, and the performance outcome (speed, accessibility, user conversion). 

In the tech industry, a working product that helps a business make money will always speak louder than a computer science degree.`,
			PublishedAt: time.Now(),
		},
	}

	for _, art := range articles {
		// Insert or update article
		err := db.SaveNews(art)
		if err != nil {
			log.Fatalf("❌ Failed to seed article '%s': %v", art.Title, err)
		}
		fmt.Printf("✅ Seeded: %s\n", art.Title)
	}

	log.Println("🎉 Seeding complete! Database has been updated with three career articles.")
}
