use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Clone, Validate)]
pub struct Address {
    #[validate(length(min = 1, message = "Address label cannot be empty"))]
    pub label: String,
    
    #[validate(length(min = 1, message = "Address value cannot be empty"))]
    pub value: String,
    
    #[serde(skip_serializing, skip_deserializing)]
    pub is_editing: bool,
}

impl Address {
    pub fn new(label: String, value: String) -> Self {
        Self {
            label,
            value,
            is_editing: false,
        }
    }
}