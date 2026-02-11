# List all tables
docker exec creator-intelligence-db psql -U creator -d creator_intelligence -c "\dt"

# See your creator row
docker exec creator-intelligence-db psql -U creator -d creator_intelligence -c "SELECT * FROM creators;"

# See all videos (empty for now)
docker exec creator-intelligence-db psql -U creator -d creator_intelligence -c "SELECT * FROM videos;"

# Interactive SQL shell
docker exec -it creator-intelligence-db psql -U creator -d creator_intelligence