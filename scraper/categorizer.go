package scraper

import (
	"strings"
)

// CategorizeJob maps a job to a specific, professional IT or business category
// by analyzing its title, tags, and source category.
func CategorizeJob(title string, tags []string, sourceCategory string) string {
	// Combine all inputs into a lowercase string for easy keyword matching
	titleLower := strings.ToLower(title)
	sourceCatLower := strings.ToLower(sourceCategory)

	// Create tags string
	var tagStr string
	if len(tags) > 0 {
		tagStr = strings.ToLower(strings.Join(tags, " "))
	}

	// Helper to check if keyword is in title, tags, or source category
	contains := func(keyword string) bool {
		return strings.Contains(titleLower, keyword) ||
			strings.Contains(tagStr, keyword) ||
			strings.Contains(sourceCatLower, keyword)
	}

	// 1. Cybersecurity / Security
	if contains("security") || contains("cybersecurity") || contains("infosec") || contains("pentest") || contains("ethical hack") || contains("soc analyst") {
		return "Cybersecurity"
	}

	// 2. QA / Testing
	if contains("qa ") || contains("testing") || contains("quality assurance") || contains("automation test") || contains("selenium") || contains("cypress") || contains("test engineer") {
		return "QA & Testing"
	}

	// 3. AI / Machine Learning
	if contains("machine learning") || contains("deep learning") || contains("nlp") || contains("llm") || contains("artificial intelligence") || contains("tensor") || contains("pytorch") || (contains("ai") && (contains("engineer") || contains("developer") || contains("research"))) {
		return "AI & Machine Learning"
	}

	// 4. DevOps / Cloud Engineering
	if contains("devops") || contains("sre") || contains("infrastructure") || contains("sysadmin") || contains("kubernetes") || contains("docker") || contains("terraform") || contains("cloud engineer") || contains("aws") || contains("azure") || contains("gcp") || contains("network engineer") {
		return "Cloud & DevOps"
	}

	// 5. Mobile Dev
	if contains("mobile") || contains("ios") || contains("android") || contains("swift") || contains("react native") || contains("flutter") || contains("kotlin") || contains("objc") {
		return "Mobile Development"
	}

	// 6. Data Science / Analytics / Data Eng
	if contains("data scientist") || contains("data science") || contains("data analyst") || contains("data engineer") || contains("analytics") || contains("database") || contains("sql") || contains("bi engineer") {
		return "Data Science & Analytics"
	}

	// 7. Frontend
	if contains("frontend") || contains("front-end") || contains("react") || contains("vue") || contains("angular") || contains("nextjs") || contains("next.js") || contains("nuxt") || contains("ui developer") || contains("javascript developer") || contains("typescript developer") {
		return "Frontend Development"
	}

	// 8. Backend
	if contains("backend") || contains("back-end") || contains("golang") || contains("python developer") || contains("django") || contains("node.js") || contains("nodejs") || contains("java ") || contains("spring boot") || contains("c#") || contains("dotnet") || contains("rust") || contains("ruby on rails") || contains("laravel") || contains("php") {
		return "Backend Development"
	}

	// 9. Fullstack
	if contains("fullstack") || contains("full-stack") || contains("full stack") {
		return "Fullstack Development"
	}

	// 10. Design / UI/UX
	if contains("design") || contains("figma") || contains("ux") || contains("ui/") || contains("product designer") || contains("graphic") || contains("illustrator") {
		return "Design & Creative"
	}

	// 11. Product / Project Management
	if contains("product manager") || contains("product owner") || contains("project manager") || contains("scrum master") || contains("agile") || contains("program manager") {
		return "Product Management"
	}

	// 12. Marketing / SEO / Sales
	if contains("marketing") || contains("seo") || contains("growth") || contains("sales") || contains("business development") || contains("account manager") || contains("content strategy") {
		return "Marketing & Sales"
	}

	// 13. Customer Support
	if contains("customer support") || contains("customer service") || contains("helpdesk") || contains("technical support") || contains("support specialist") {
		return "Customer Support"
	}

	// 14. Writing / Content
	if contains("writer") || contains("writing") || contains("content creator") || contains("copywriter") || contains("editor") {
		return "Writing & Content"
	}

	// 15. HR / Finance / Legal / Executive
	if contains("hr") || contains("human resources") || contains("recruiter") || contains("finance") || contains("accounting") || contains("legal") || contains("operations") || contains("executive") || contains("cfo") || contains("coo") || contains("ceo") {
		return "HR & Operations"
	}

	// Default fallback mappings based on source category
	if sourceCatLower != "" {
		if strings.Contains(sourceCatLower, "programming") || strings.Contains(sourceCatLower, "software") || strings.Contains(sourceCatLower, "dev") || strings.Contains(sourceCatLower, "engineering") {
			return "Fullstack Development"
		}
		if strings.Contains(sourceCatLower, "design") {
			return "Design & Creative"
		}
		if strings.Contains(sourceCatLower, "marketing") {
			return "Marketing & Sales"
		}
		if strings.Contains(sourceCatLower, "data") {
			return "Data Science & Analytics"
		}
		if strings.Contains(sourceCatLower, "devops") {
			return "Cloud & DevOps"
		}
		if strings.Contains(sourceCatLower, "support") {
			return "Customer Support"
		}
		if strings.Contains(sourceCatLower, "writing") {
			return "Writing & Content"
		}
		if strings.Contains(sourceCatLower, "finance") || strings.Contains(sourceCatLower, "hr") {
			return "HR & Operations"
		}
	}

	// Generic default fallback
	return "Fullstack Development"
}
