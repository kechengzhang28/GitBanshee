use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub lane: usize,
    pub row: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Path {
    pub points: Vec<Point>,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub start: Point,
    pub control: Point,
    pub end: Point,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub paths: Vec<Path>,
    pub links: Vec<Link>,
}

impl Default for GraphData {
    fn default() -> Self {
        Self {
            paths: vec![],
            links: vec![],
        }
    }
}
