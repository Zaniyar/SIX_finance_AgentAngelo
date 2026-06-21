package advisory.authz

import rego.v1

# ── Default deny ─────────────────────────────────────────────────────────────
default allow := false
default reasons := []
default citation_required := true

# ── Decision ──────────────────────────────────────────────────────────────────
allow if {
	count(deny_reasons) == 0
}

reasons := deny_reasons

# ── Grounding: every claim must be traceable to a data source ─────────────────
# Each number/ticker in the LLM output must appear in the context evidence_ids
grounding_ok if {
	# No claimed tickers that aren't in the real portfolio
	every ticker in input.claimed_tickers {
		ticker in input.context.portfolio_tickers
	}
}

grounding_ok if {
	# No claimed tickers at all — fine
	count(input.claimed_tickers) == 0
}

# ── Citation: each assertion must reference an API source ─────────────────────
citations_ok if {
	input.action != "recommend"
}

citations_ok if {
	input.action == "recommend"
	count(input.citations) > 0
	every c in input.citations {
		c.api_endpoint != ""
		c.field != ""
	}
}

# ── Deny rules ────────────────────────────────────────────────────────────────
deny_reasons contains reason if {
	some ticker in input.claimed_tickers
	not ticker in input.context.portfolio_tickers
	reason := sprintf("HALLUCINATION: ticker %q not found in portfolio (known: %v)", [ticker, input.context.portfolio_tickers])
}

deny_reasons contains "CITATION_MISSING: recommendation requires API-sourced citations" if {
	not citations_ok
}

deny_reasons contains "SUITABILITY: product risk exceeds client risk tolerance" if {
	input.action in {"recommend", "rebalance"}
	input.product.risk_score > input.client.risk_score
}

deny_reasons contains "CONCENTRATION: position would exceed mandate limit" if {
	input.action in {"recommend", "rebalance"}
	input.resulting_position_pct > data.policy.concentration_limit_pct[input.client.mandate]
}

deny_reasons contains "SANCTIONS: client or counterparty on sanctions list" if {
	input.client.sanctioned == true
}

deny_reasons contains "MANDATE: product category excluded by client mandate" if {
	input.action in {"recommend", "rebalance"}
	input.product.category in data.policy.mandate_exclusions[input.client.mandate]
}

deny_reasons contains "EVIDENCE_STALE: context data older than allowed maximum" if {
	input.action in {"recommend", "rebalance", "draft"}
	input.context.data_age_days > data.policy.max_evidence_age_days
}

# ── Non-blocking obligations ──────────────────────────────────────────────────
obligations contains "EDD_REQUIRED: enhanced due diligence before execution" if {
	allow
	input.client.pep == true
}

obligations contains "RM_APPROVAL: senior advisor sign-off required" if {
	allow
	input.client.aum_chf_m > data.policy.senior_signoff_threshold_chf_m
}

obligations contains "TAX_CHECK: confirm suitability for client tax domicile" if {
	allow
	input.action in {"recommend", "rebalance"}
	input.client.tax_domicile != "CH"
}

# ── Source map for citation enforcement ───────────────────────────────────────
# Maps each field an LLM might cite to the canonical API endpoint that owns it
required_citations := {
	"exposurePct":       {"api": "/api/clients/:id/portfolio-fit", "field": "holdings[].weight_pct"},
	"currentChf":        {"api": "/api/clients/:id/portfolio-fit", "field": "holdings[].currentChf"},
	"alertTitle":        {"api": "/api/alerts/:id",                "field": "title"},
	"alertBody":         {"api": "/api/alerts/:id",                "field": "body"},
	"dnaValue":          {"api": "/api/clients/:id/dna",           "field": "values[].label"},
	"swapCandidate":     {"api": "/api/alerts/:id",                "field": "swap.toCandidate.issuer"},
	"priorityScore":     {"api": "/api/alerts",                    "field": "priority_score"},
	"livePrice":         {"api": "/api/clients/:id/portfolio-fit", "field": "holdings[].livePrice"},
	"newsHeadline":      {"api": "/api/news",                      "field": "articles[].title"},
}
