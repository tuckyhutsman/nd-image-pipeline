#!/bin/bash
# Image Pipeline Utility Commands
# Helpful commands for managing the pipeline system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print help
print_help() {
    cat << EOF
${BLUE}Image Pipeline Utility Commands${NC}

Usage: ./pipeline-utils.sh <command>

${GREEN}Database Commands:${NC}
  flush-pipelines       - Delete all pipelines from database
  flush-jobs            - Delete all jobs from database (keeps pipeline definitions)
  flush-all             - Delete EVERYTHING (pipelines, jobs, outputs)
  reset-database        - Truncate all tables and reset to clean state

${GREEN}Queue Commands:${NC}
  flush-queue           - Clear all jobs from Redis queue
  queue-stats           - Show current queue statistics

${GREEN}Output Commands:${NC}
  clean-outputs         - Delete all processed output files
  list-outputs          - Show all output directories

${GREEN}Diagnostic Commands:${NC}
  check-health          - Check system health
  show-pipelines        - List all pipelines in database
  show-jobs             - List all jobs in database

${GREEN}Utility:${NC}
  help                  - Show this help message

${YELLOW}Examples:${NC}
  ./pipeline-utils.sh flush-all
  ./pipeline-utils.sh reset-database
  ./pipeline-utils.sh queue-stats

EOF
}

# Database connection helper
db_query() {
    docker compose exec -T postgres psql -U pipeline_user -d pipeline_db -c "$1"
}

# Redis helper
redis_cmd() {
    docker compose exec -T redis redis-cli "$@"
}

# Flush all pipelines
flush_pipelines() {
    echo -e "${YELLOW}⚠️  Flushing all pipelines from database...${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        db_query "TRUNCATE TABLE pipelines CASCADE;"
        echo -e "${GREEN}✓ All pipelines deleted${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Flush all jobs
flush_jobs() {
    echo -e "${YELLOW}⚠️  Flushing all jobs from database...${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        db_query "TRUNCATE TABLE jobs CASCADE;"
        echo -e "${GREEN}✓ All jobs deleted${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Flush everything
flush_all() {
    echo -e "${RED}⚠️  DANGER: Flushing EVERYTHING (pipelines, jobs, outputs, queue)${NC}"
    read -p "Type 'DELETE ALL' to confirm: " confirm
    if [ "$confirm" = "DELETE ALL" ]; then
        echo -e "${YELLOW}Flushing database...${NC}"
        db_query "TRUNCATE TABLE jobs CASCADE;"
        db_query "TRUNCATE TABLE pipelines CASCADE;"
        
        echo -e "${YELLOW}Flushing Redis queue...${NC}"
        redis_cmd FLUSHDB
        
        echo -e "${YELLOW}Cleaning output files...${NC}"
        docker compose exec -T api rm -rf /tmp/pipeline-output/*
        
        echo -e "${GREEN}✓ Everything cleared!${NC}"
        echo -e "${BLUE}System is ready for fresh start${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Reset database to clean state
reset_database() {
    echo -e "${RED}⚠️  DANGER: Resetting database to initial state${NC}"
    read -p "Type 'RESET DATABASE' to confirm: " confirm
    if [ "$confirm" = "RESET DATABASE" ]; then
        echo -e "${YELLOW}Running database reset...${NC}"
        docker compose exec -T postgres psql -U pipeline_user -d pipeline_db -f /docker-entrypoint-initdb.d/init-db.sql 2>/dev/null || {
            # Manual reset if init script not available
            db_query "TRUNCATE TABLE jobs CASCADE;"
            db_query "TRUNCATE TABLE pipelines CASCADE;"
            echo -e "${GREEN}✓ Database tables truncated${NC}"
        }
        
        echo -e "${YELLOW}Flushing Redis...${NC}"
        redis_cmd FLUSHDB
        
        echo -e "${YELLOW}Cleaning outputs...${NC}"
        docker compose exec -T api rm -rf /tmp/pipeline-output/*
        
        echo -e "${GREEN}✓ Database reset complete!${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Flush Redis queue
flush_queue() {
    echo -e "${YELLOW}⚠️  Flushing Redis queue...${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        redis_cmd FLUSHDB
        echo -e "${GREEN}✓ Queue flushed${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Show queue statistics
queue_stats() {
    echo -e "${BLUE}Queue Statistics:${NC}"
    redis_cmd INFO stats || echo "Redis not accessible"
}

# Clean output files
clean_outputs() {
    echo -e "${YELLOW}Cleaning output files...${NC}"
    docker compose exec -T api rm -rf /tmp/pipeline-output/*
    echo -e "${GREEN}✓ Output files deleted${NC}"
}

# List output directories
list_outputs() {
    echo -e "${BLUE}Output Directories:${NC}"
    docker compose exec -T api find /tmp/pipeline-output -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | head -20
}

# Check system health
check_health() {
    echo -e "${BLUE}System Health Check${NC}"
    
    echo -n "Database: "
    if db_query "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
    fi
    
    echo -n "Redis: "
    if redis_cmd PING | grep -q PONG; then
        echo -e "${GREEN}✓ Connected${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
    fi
    
    echo -n "API Container: "
    if docker compose ps api | grep -q "Up"; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not Running${NC}"
    fi
    
    echo -n "Worker Container: "
    if docker compose ps worker | grep -q "Up"; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not Running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Database Stats:${NC}"
    echo -n "  Pipelines: "
    db_query "SELECT COUNT(*) FROM pipelines;" | grep -oE '[0-9]+' | head -1
    
    echo -n "  Jobs: "
    db_query "SELECT COUNT(*) FROM jobs;" | grep -oE '[0-9]+' | head -1
    
    echo -n "  Queue Size: "
    redis_cmd DBSIZE | grep -oE '[0-9]+'
}

# Show all pipelines
show_pipelines() {
    echo -e "${BLUE}All Pipelines:${NC}"
    db_query "SELECT id, name, customer_id, created_at FROM pipelines ORDER BY created_at DESC;"
}

# Show all jobs
show_jobs() {
    echo -e "${BLUE}Recent Jobs (last 20):${NC}"
    db_query "SELECT id, pipeline_id, status, file_name, created_at FROM jobs ORDER BY created_at DESC LIMIT 20;"
}

# Main command handler
case "${1:-help}" in
    flush-pipelines)
        flush_pipelines
        ;;
    flush-jobs)
        flush_jobs
        ;;
    flush-all)
        flush_all
        ;;
    reset-database)
        reset_database
        ;;
    flush-queue)
        flush_queue
        ;;
    queue-stats)
        queue_stats
        ;;
    clean-outputs)
        clean_outputs
        ;;
    list-outputs)
        list_outputs
        ;;
    check-health)
        check_health
        ;;
    show-pipelines)
        show_pipelines
        ;;
    show-jobs)
        show_jobs
        ;;
    help)
        print_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        print_help
        exit 1
        ;;
esac
