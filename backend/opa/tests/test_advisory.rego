package advisory.authz_test

import rego.v1

# Scenario 1: Clean allow — grounded recommendation with citations
test_clean_allow if {
	result := data.advisory.authz.allow with input as {
		"action": "recommend",
		"client": {"risk_score": 6, "mandate": "Balanced", "sanctioned": false, "pep": false, "tax_domicile": "CH", "aum_chf_m": 2.5},
		"product": {"risk_score": 5, "category": "Equity"},
		"resulting_position_pct": 8.0,
		"context": {"portfolio_tickers": ["NOVN.SW", "ROG.SW"], "data_age_days": 2},
		"claimed_tickers": ["NOVN.SW"],
		"citations": [{"api_endpoint": "/api/clients/schneider/portfolio-fit", "field": "holdings[].weight_pct", "value": "5.8%"}],
	}
	result == true
}

# Scenario 2: Hallucination — ticker not in portfolio
test_hallucination_blocked if {
	result := data.advisory.authz.allow with input as {
		"action": "recommend",
		"client": {"risk_score": 6, "mandate": "Balanced", "sanctioned": false, "pep": false, "tax_domicile": "CH", "aum_chf_m": 2.5},
		"product": {"risk_score": 5, "category": "Equity"},
		"resulting_position_pct": 8.0,
		"context": {"portfolio_tickers": ["NOVN.SW"], "data_age_days": 2},
		"claimed_tickers": ["AAPL"],
		"citations": [{"api_endpoint": "/api/clients/schneider/portfolio-fit", "field": "holdings[].weight_pct", "value": "5.8%"}],
	}
	result == false
}

test_hallucination_reason if {
	result := data.advisory.authz.reasons with input as {
		"action": "recommend",
		"client": {"risk_score": 6, "mandate": "Balanced", "sanctioned": false, "pep": false, "tax_domicile": "CH", "aum_chf_m": 2.5},
		"product": {"risk_score": 5, "category": "Equity"},
		"resulting_position_pct": 8.0,
		"context": {"portfolio_tickers": ["NOVN.SW"], "data_age_days": 2},
		"claimed_tickers": ["AAPL"],
		"citations": [{"api_endpoint": "/api/clients/schneider/portfolio-fit", "field": "holdings[].weight_pct", "value": "5.8%"}],
	}
	# Reason now includes the specific ticker name
	some r in result
	startswith(r, "HALLUCINATION: ticker")
	contains(r, "AAPL")
}

# Scenario 3: Missing citations
test_missing_citations_blocked if {
	result := data.advisory.authz.allow with input as {
		"action": "recommend",
		"client": {"risk_score": 6, "mandate": "Balanced", "sanctioned": false, "pep": false, "tax_domicile": "CH", "aum_chf_m": 2.5},
		"product": {"risk_score": 5, "category": "Equity"},
		"resulting_position_pct": 8.0,
		"context": {"portfolio_tickers": ["NOVN.SW"], "data_age_days": 2},
		"claimed_tickers": ["NOVN.SW"],
		"citations": [],
	}
	result == false
}

# Scenario 4: Suitability breach
test_suitability_breach if {
	result := data.advisory.authz.allow with input as {
		"action": "recommend",
		"client": {"risk_score": 3, "mandate": "Defensive", "sanctioned": false, "pep": false, "tax_domicile": "CH", "aum_chf_m": 2.5},
		"product": {"risk_score": 8, "category": "Equity"},
		"resulting_position_pct": 5.0,
		"context": {"portfolio_tickers": ["NOVN.SW"], "data_age_days": 2},
		"claimed_tickers": [],
		"citations": [{"api_endpoint": "/api/alerts/a-1", "field": "title", "value": "Buy signal"}],
	}
	result == false
}

# Scenario 5: Sanctions hard block
test_sanctions_block if {
	result := data.advisory.authz.allow with input as {
		"action": "draft",
		"client": {"risk_score": 5, "mandate": "Balanced", "sanctioned": true, "pep": false, "tax_domicile": "CH", "aum_chf_m": 1.0},
		"product": {"risk_score": 4, "category": "Equity"},
		"resulting_position_pct": 5.0,
		"context": {"portfolio_tickers": [], "data_age_days": 1},
		"claimed_tickers": [],
		"citations": [],
	}
	result == false
}

# Scenario 6: PEP → allow but with obligation
test_pep_obligation if {
	result := data.advisory.authz.obligations with input as {
		"action": "recommend",
		"client": {"risk_score": 7, "mandate": "Growth", "sanctioned": false, "pep": true, "tax_domicile": "CH", "aum_chf_m": 3.0},
		"product": {"risk_score": 6, "category": "Equity"},
		"resulting_position_pct": 10.0,
		"context": {"portfolio_tickers": ["ROG.SW"], "data_age_days": 1},
		"claimed_tickers": [],
		"citations": [{"api_endpoint": "/api/clients/huber/portfolio-fit", "field": "holdings[].weight_pct", "value": "4.2%"}],
	}
	"EDD_REQUIRED: enhanced due diligence before execution" in result
}
