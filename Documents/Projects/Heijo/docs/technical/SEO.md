# Heijō Site SEO & Social Media Optimization

## ✅ Complete Implementation

The entire Heijō site has been optimized for external publishing across all major platforms including Substack, Threads/Instagram, LinkedIn, Twitter/X, and Medium.

## 🎯 Key Features Implemented

### 1. Global Metadata System
- **Comprehensive metadata utility** (`/src/lib/metadata.ts`)
- **All pages optimized** with Open Graph + Twitter Card metadata
- **Automatic fallbacks** for missing cover images and descriptions
- **Consistent branding** across all social platforms

### 2. RSS Feed Integration
- **RSS endpoint** at `/rss.xml` 
- **Auto-import ready** for Substack and Medium
- **10 most recent posts** with full metadata
- **Proper XML structure** with images and categories

### 3. JSON-LD Structured Data
- **Website Schema** for site-wide SEO
- **Article Schema** for all blog posts
- **Organization Schema** for brand recognition
- **Breadcrumb Schema** support for navigation

### 4. Social Media Optimization
- **Open Graph tags** for Facebook, LinkedIn, Threads/Instagram
- **Twitter Card tags** for X/Twitter
- **Large image cards** (1200x630) for maximum impact
- **Truncated descriptions** (≤160 chars) for optimal previews

## 📄 Pages Optimized

### Static Pages
- ✅ Home (`/`)
- ✅ Blog Index (`/blog`)
- ✅ Flow State (`/flow`)
- ✅ Learn (`/learn`)
- ✅ Products (`/products`)
- ✅ Give Back (`/give-back`)
- ✅ Privacy (`/privacy`)
- ✅ Terms (`/terms`)

### Blog Posts
- ✅ Journaling for Calm (`/blog/journaling-for-calm`)
- ✅ Building Heijō (`/blog/building-heijo`)
- ✅ Micro-Meditation Science (`/blog/micro-meditation-science`)
- ✅ Nervous System 101 (`/blog/nervous-system-101`)
- ✅ Why Frequencies (`/blog/why-frequencies`)

## 🔧 Technical Implementation

### Metadata Structure
Each page includes:
```html
<!-- Open Graph -->
<meta property="og:type" content="website|article" />
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Optimized description" />
<meta property="og:url" content="https://heijo.io/page" />
<meta property="og:image" content="https://heijo.io/images/page-og.jpg" />
<meta property="og:site_name" content="Heijō" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Page Title" />
<meta name="twitter:description" content="Optimized description" />
<meta name="twitter:image" content="https://heijo.io/images/page-og.jpg" />
<meta name="twitter:creator" content="@heijo" />
```

### RSS Feed Structure
- **Valid XML 2.0** format
- **CDATA sections** for proper encoding
- **Image enclosures** for rich previews
- **Proper timestamps** and metadata
- **Caching headers** for performance

### JSON-LD Schemas
- **Website Schema** with search functionality
- **Article Schema** with full metadata
- **Organization Schema** with contact info
- **Breadcrumb Schema** for navigation

## 🎨 Default Assets

### Fallback System
- **Default OG image** at `/images/default-og.svg`
- **Automatic fallback** when no cover image specified
- **Consistent branding** across all pages
- **High-quality SVG** for crisp display

### Image Specifications
- **Dimensions**: 1200x630px (optimal for all platforms)
- **Format**: JPG for photos, SVG for graphics
- **Alt text**: Descriptive and SEO-friendly
- **Loading**: Optimized for social media crawlers

## 🚀 Platform Compatibility

### ✅ Fully Supported
- **Twitter/X** - Large image cards with rich metadata
- **LinkedIn** - Professional article previews
- **Facebook** - Rich link previews with images
- **Threads/Instagram** - Meta's social sharing
- **Substack** - RSS import ready
- **Medium** - RSS import ready

### 🔍 SEO Benefits
- **Google Rich Results** - Structured data support
- **AI Search Engines** - Comprehensive metadata
- **Social Crawlers** - Optimized for all platforms
- **RSS Aggregators** - Full feed support

## 📊 Testing & Validation

### Ready for Testing
- **Meta Debugger** (Facebook/Instagram)
- **Twitter Card Validator**
- **LinkedIn Post Inspector**
- **Google Rich Results Test**
- **RSS Feed Validators**

### Performance Optimized
- **Cached RSS feed** (1 hour TTL)
- **Optimized images** for fast loading
- **Minimal metadata** for quick parsing
- **CDN-ready** asset structure

## 🎯 Next Steps

1. **Test with validators** to ensure perfect previews
2. **Import RSS feed** to Substack/Medium
3. **Monitor social shares** for engagement
4. **Update cover images** as needed
5. **Add new blog posts** using the same pattern

The entire Heijō site is now fully optimized for external publishing and social media sharing across all major platforms!

