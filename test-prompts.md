# Shopify App Generation Test Prompts

This document contains carefully crafted prompts to test the accuracy and effectiveness of our enhanced MCP tools for Shopify app development.

## 🎯 Accuracy Testing Framework

### **Tier 1: Basic Component Usage (Should be 95%+ accurate)**

#### Test 1.1: Simple Product Display

```
Create a Shopify app page that displays a list of products. Use Polaris components to show:
- A page header with the title "Product Catalog"
- A grid layout showing product cards
- Each card should have an image, title, price, and "View Details" button
```

#### Test 1.2: Settings Page

```
Build a settings page for a Shopify app with:
- Page title "App Settings"
- A form with text fields for API key and webhook URL
- Toggle switches for "Enable notifications" and "Auto-sync orders"
- Save and Cancel buttons at the bottom
```

#### Test 1.3: Dashboard Overview

```
Create a dashboard page that shows:
- Welcome banner with success tone
- Stats grid showing 4 metrics (Orders, Revenue, Customers, Products)
- A recent activity section with a simple list
- Action buttons for "Sync Data" and "View Reports"
```

### **Tier 2: Intermediate Composition (Should be 80%+ accurate)**

#### Test 2.1: Order Management Interface

```
Design an order management page with:
- Search and filter controls at the top
- A data table showing order details (ID, customer, status, total)
- Bulk action buttons (Mark as fulfilled, Export selected)
- Pagination controls
- Status badges with appropriate colors (pending=warning, fulfilled=success, cancelled=critical)
```

#### Test 2.2: Product Form

```
Create a comprehensive product creation form with:
- Product title and description fields
- Image upload area with preview
- Pricing section (price, compare at price, cost per item)
- Inventory tracking toggle and quantity field
- SEO section with meta title and description
- Save as draft and Publish buttons
```

#### Test 2.3: Customer Profile

```
Build a customer profile page showing:
- Customer header with avatar, name, and contact info
- Order history table with expandable rows
- Customer tags and notes section
- Action buttons for "Send email", "Add note", "View orders"
- Address book with billing and shipping addresses
```

### **Tier 3: Advanced Patterns (Should be 70%+ accurate)**

#### Test 3.1: Multi-step Wizard

```
Create a multi-step app onboarding wizard with:
- Progress indicator showing 4 steps
- Step 1: Welcome with app benefits
- Step 2: Connect store (API credentials form)
- Step 3: Configure settings (multiple choice lists)
- Step 4: Review and confirm
- Navigation with Previous/Next buttons and step validation
```

#### Test 3.2: Analytics Dashboard

```
Design an analytics dashboard with:
- Date range picker in the header
- Key metrics cards with trend indicators
- Charts section (placeholder for now)
- Filterable data table with export functionality
- Comparison view toggle (this period vs previous)
```

#### Test 3.3: Bulk Editor

```
Create a bulk product editor with:
- Product selection interface with search/filter
- Batch operation selector (update price, change status, add tags)
- Preview of changes before applying
- Progress indicator during bulk operations
- Success/error reporting with retry options
```

## 🧪 Component-Specific Tests

### **Navigation & Layout**

```
Create an app with a sidebar navigation containing:
- Logo/app name at top
- Primary nav items (Dashboard, Products, Orders, Customers, Settings)
- Secondary actions (Help, Account)
- Collapsible sections for better organization
```

### **Forms & Validation**

```
Build a contact form with:
- Required field indicators
- Email field with validation
- Phone number field with formatting
- Message textarea with character count
- Submit button that shows loading state
- Error handling and success messages
```

### **Data Display**

```
Create a reporting interface with:
- Sortable table headers
- Row selection checkboxes
- Expandable row details
- Empty state when no data
- Loading states for async data
- Pagination with page size options
```

## 🎪 Demo Scenarios

### **Demo 1: "Zero to App in 60 Seconds"**

```
Create a complete Shopify app for inventory management with:
1. Dashboard showing low stock alerts
2. Product list with quick edit capabilities
3. Reorder recommendations based on sales velocity
4. Settings page for notification preferences
Make it production-ready with proper navigation and error handling.
```

### **Demo 2: "Customer Service Portal"**

```
Build a customer service app featuring:
1. Ticket management interface with status tracking
2. Customer lookup with order history
3. Quick actions for common tasks (refund, reorder, update address)
4. Knowledge base search integration
5. Team collaboration features (assign, comment, escalate)
```

### **Demo 3: "Marketing Campaign Manager"**

```
Design a marketing campaign management tool with:
1. Campaign creation wizard with templates
2. Audience segmentation interface
3. Performance dashboard with key metrics
4. A/B testing setup and results
5. Integration settings for email/SMS providers
```

## 📊 Success Metrics

### **Accuracy Scoring**

- **Perfect (100%)**: Generated code runs without modification
- **Excellent (90-99%)**: Minor tweaks needed (missing imports, small syntax fixes)
- **Good (80-89%)**: Component choices correct, structure needs adjustment
- **Fair (70-79%)**: Right direction but significant rework needed
- **Poor (<70%)**: Wrong components or completely off-track

### **Evaluation Criteria**

1. **Component Selection**: Are the right Polaris components used?
2. **Structure**: Is the component hierarchy logical and semantic?
3. **Props Usage**: Are component properties used correctly?
4. **Accessibility**: Are ARIA labels and semantic structure present?
5. **Best Practices**: Does it follow Shopify design patterns?

### **Testing Protocol**

1. Run each prompt 3 times to test consistency
2. Score each attempt using the accuracy scale
3. Document common failure patterns
4. Track improvement over time
5. A/B test with and without enhanced schema tools

## 🔄 Continuous Improvement

### **Feedback Loop**

1. **Collect**: Save all generated code samples
2. **Analyze**: Identify patterns in failures
3. **Enhance**: Update schema or suggestion algorithms
4. **Validate**: Re-test with improved system
5. **Deploy**: Push improvements to production

### **Schema Enhancement Priorities**

1. **Missing Components**: Add components that are frequently needed but missing
2. **Prop Validation**: Improve property type checking and validation
3. **Composition Rules**: Better parent-child relationship modeling
4. **Usage Examples**: Add real-world usage patterns to schema
5. **Error Messages**: Improve feedback when components are misused

## 🚀 Usage Instructions

1. **Setup**: Ensure MCP server is running with enhanced schema tools
2. **Baseline**: Test with original tools (comment out new ones)
3. **Enhanced**: Test with full enhanced toolset
4. **Compare**: Measure accuracy improvement
5. **Iterate**: Use failures to improve schema and tools

This testing framework will help us achieve and maintain the 80% first-prompt accuracy goal while providing clear metrics for continuous improvement.
