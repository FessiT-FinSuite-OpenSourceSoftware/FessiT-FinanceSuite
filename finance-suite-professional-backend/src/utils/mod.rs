pub mod validation;
pub mod auth;
pub mod jwt_middleware;
pub mod permissions;
pub mod permission_extractor;

// Re-export auth functions for easier access
pub use auth::{generate_token, generate_refresh_token, verify_token, verify_refresh_token, extract_token_from_header, Claims, RefreshClaims, JwtConfig};

/// Returns (current_month "YYYY-MM", previous_month "YYYY-MM")
pub fn last_two_months() -> (String, String) {
    use chrono::Datelike;
    let now = chrono::Utc::now();
    let current = format!("{}-{:02}", now.year(), now.month());
    let prev = if now.month() == 1 {
        format!("{}-12", now.year() - 1)
    } else {
        format!("{}-{:02}", now.year(), now.month() - 1)
    };
    (current, prev)
}

/// Returns all "YYYY-MM" strings in the current Indian financial year (Apr–Mar),
/// up to and including the current month.
pub fn current_fy_months() -> Vec<String> {
    use chrono::Datelike;
    let now = chrono::Utc::now();
    let fy_start_year = if now.month() >= 4 { now.year() } else { now.year() - 1 };
    let mut months = Vec::new();
    // Apr..Dec of fy_start_year
    for m in 4u32..=12 {
        let ym = format!("{}-{:02}", fy_start_year, m);
        months.push(ym.clone());
        if fy_start_year == now.year() && m == now.month() { return months; }
    }
    // Jan..Mar of fy_start_year+1
    for m in 1u32..=3 {
        let ym = format!("{}-{:02}", fy_start_year + 1, m);
        months.push(ym.clone());
        if fy_start_year + 1 == now.year() && m == now.month() { return months; }
    }
    months
}