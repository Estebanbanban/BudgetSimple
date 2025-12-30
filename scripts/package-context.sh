#!/bin/bash

# Script to package all key project context documents
# Usage: ./scripts/package-context.sh

set -e

PACKAGE_DIR="context-package"
DOCS_DIR="docs"
BMAD_OUTPUT_DIR="_bmad-output"

echo "📦 Packaging Budgetsimple project context..."

# Create package directory
mkdir -p "$PACKAGE_DIR"
cd "$PACKAGE_DIR"

# Copy index first
echo "📄 Copying index..."
cp "../docs/PROJECT-CONTEXT-INDEX.md" "00-INDEX.md"

# Copy PRD (try multiple locations)
echo "📋 Copying PRD..."
if [ -f "../$BMAD_OUTPUT_DIR/project-planning-artifacts/prd.md" ]; then
    cp "../$BMAD_OUTPUT_DIR/project-planning-artifacts/prd.md" "01-PRD.md"
elif [ -f "../$BMAD_OUTPUT_DIR/prd.md" ]; then
    cp "../$BMAD_OUTPUT_DIR/prd.md" "01-PRD.md"
else
    echo "⚠️  Warning: PRD not found. Checked:"
    echo "   - $_bmad-output/project-planning-artifacts/prd.md"
    echo "   - $_bmad-output/prd.md"
fi

# Copy core documentation
echo "📚 Copying core docs..."
cp "../$DOCS_DIR/architecture.md" "02-ARCHITECTURE.md"
cp "../$DOCS_DIR/web-app-basics.md" "03-WEB-APP-BASICS.md"
cp "../$DOCS_DIR/front-end-spec.md" "04-FRONTEND-SPEC.md"
cp "../README.md" "05-README.md"

# Copy epic plans
echo "🎯 Copying epic plans..."
cp "../$DOCS_DIR/epic-3-dashboard-plan.md" "06-EPIC-3-DASHBOARD.md"
cp "../$DOCS_DIR/epic-4-subscription-detection-plan.md" "07-EPIC-4-SUBSCRIPTIONS-PLAN.md"
cp "../$DOCS_DIR/epic-4-implementation-summary.md" "08-EPIC-4-SUBSCRIPTIONS-IMPL.md"
cp "../$DOCS_DIR/epic-5-milestones-projection-plan.md" "09-EPIC-5-MILESTONES.md"

# Copy all stories
echo "📖 Copying stories..."
mkdir -p "stories"

# Epic 3 stories
cp "../$DOCS_DIR/stories/3.1.core-dashboard-kpis.md" "stories/3.1-core-dashboard-kpis.md"
cp "../$DOCS_DIR/stories/3.2.explain-number-drilldowns.md" "stories/3.2-explain-number-drilldowns.md"
cp "../$DOCS_DIR/stories/3.3.action-items-panel.md" "stories/3.3-action-items-panel.md"

# Epic 4 stories
cp "../$DOCS_DIR/stories/4.1.subscription-detection.md" "stories/4.1-subscription-detection.md"
cp "../$DOCS_DIR/stories/4.2.subscription-review-ui.md" "stories/4.2-subscription-review-ui.md"
cp "../$DOCS_DIR/stories/4.3.subscription-summaries.md" "stories/4.3-subscription-summaries.md"

# Epic 5 stories
cp "../$DOCS_DIR/stories/5.1.milestone-management.md" "stories/5.1-milestone-management.md"
cp "../$DOCS_DIR/stories/5.2.projection-engine.md" "stories/5.2-projection-engine.md"
cp "../$DOCS_DIR/stories/5.3.milestone-status-eta.md" "stories/5.3-milestone-status-eta.md"
cp "../$DOCS_DIR/stories/5.4.timeline-visualization.md" "stories/5.4-timeline-visualization.md"
cp "../$DOCS_DIR/stories/5.5.dashboard-widget.md" "stories/5.5-dashboard-widget.md"

# Copy additional docs
if [ -f "../$DOCS_DIR/SUBSCRIPTION_SETUP.md" ]; then
    cp "../$DOCS_DIR/SUBSCRIPTION_SETUP.md" "SUBSCRIPTION_SETUP.md"
fi

# Create a README for the package
cat > README.md << 'EOF'
# Budgetsimple Project Context Package

This directory contains all key documentation for the Budgetsimple project.

## Reading Order

1. **00-INDEX.md** - Start here! Lists all files and their purpose
2. **01-PRD.md** - Product Requirements Document (complete product vision)
3. **02-ARCHITECTURE.md** - Technical architecture and infrastructure
4. **03-WEB-APP-BASICS.md** - Beginner guide to web app concepts
5. **04-FRONTEND-SPEC.md** - UI/UX specifications
6. **06-09-EPIC-*.md** - Feature plans for each epic
7. **stories/** - Individual user story specifications

## Quick Reference

- **Epic 3:** Dashboard Enhancements (✅ Completed)
- **Epic 4:** Subscription Detection (✅ Completed)
- **Epic 5:** Milestones & Projection Timeline (📋 Planned)

## Usage

Share this entire directory (or specific files) with an AI assistant to provide full project context.

The files are numbered in recommended reading order.
EOF

cd ..

# Count files
FILE_COUNT=$(find "$PACKAGE_DIR" -type f -name "*.md" | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$PACKAGE_DIR" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo "📁 Location: $PACKAGE_DIR/"
echo "📊 Files: $FILE_COUNT markdown files"
echo "💾 Size: $TOTAL_SIZE"
echo ""
echo "📝 Next steps:"
echo "   1. Review the package: ls -la $PACKAGE_DIR/"
echo "   2. Share with AI: Upload the entire $PACKAGE_DIR/ folder"
echo "   3. Or share specific files as needed"
echo ""

