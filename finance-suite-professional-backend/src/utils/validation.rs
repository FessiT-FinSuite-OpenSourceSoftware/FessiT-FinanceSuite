use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    pub static ref PHONE_REGEX: Regex = Regex::new(r"^\d{10,15}$").unwrap();
}