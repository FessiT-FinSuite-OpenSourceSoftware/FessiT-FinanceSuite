use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Deserializer, Serialize};
use mongodb::bson::Bson;

fn deserialize_optional_object_id<'de, D>(deserializer: D) -> Result<Option<ObjectId>, D::Error>
where
    D: Deserializer<'de>,
{
    let value: Option<Bson> = Option::deserialize(deserializer)?;
    match value {
        None | Some(Bson::Null) => Ok(None),
        Some(Bson::ObjectId(id)) => Ok(Some(id)),
        Some(Bson::String(s)) => {
            if s.trim().is_empty() {
                Ok(None)
            } else {
                ObjectId::parse_str(&s).map(Some).map_err(serde::de::Error::custom)
            }
        }
        Some(other) => Err(serde::de::Error::custom(format!(
            "expected ObjectId or string, got {:?}",
            other
        ))),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Service {
    #[serde(rename = "_id", alias = "id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    #[serde(rename = "organisationId", default, deserialize_with = "deserialize_optional_object_id")]
    pub organisation_id: Option<ObjectId>,

    #[serde(rename = "serviceName", default)]
    pub service_name: String,

    #[serde(rename = "serviceDescription", default)]
    pub service_description: String,

    #[serde(rename = "serviceAmount", default)]
    pub service_amount: f64,
}

pub type CreateServiceRequest = Service;
pub type UpdateServiceRequest = Service;
