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