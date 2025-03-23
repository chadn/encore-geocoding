CREATE TABLE locations (
	location TEXT PRIMARY KEY,
	full_address TEXT NOT NULL,
	latitude REAL NOT NULL,
	longitude REAL NOT NULL,
	status TEXT NOT NULL
);
