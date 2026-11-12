# Vanshawali 360 — Cloudflare Workers Deployment

यो फाइल **V5 Demo UI** लाई आफ्नै Cloudflare account मा चलाउनको लागि हो। साइट अहिले वास्तविक multi-user database र login भएको production system होइन। सदस्यको demo data ब्राउजर local storage मा रहन सक्छ। त्यसैले यो deployment लाई पहिलो चरणमा test/demo मात्र राख्नुहोस्।

## तयारी

1. ZIP extract गर्नुहोस् र VS Code / Terminal मा त्यो folder खोल्नुहोस्।
2. Node.js 22.13+ र Git स्थापना गर्नुहोस्।
3. Cloudflare account मा login भएको browser राख्नुहोस्। Cloudflare account ID वा token कसैलाई chat मा नपठाउनुहोस्।
4. Terminal मा यो क्रम चलाउनुहोस्:

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
npx wrangler login
npx wrangler whoami
node deployment/cloudflare-deploy.mjs
```

> `wrangler whoami` ले आफूले चाहेको Cloudflare account देखाएको सुनिश्चित गर्नुहोस्। Deploy script ले **vanshawali-360** नामको Worker deploy गर्छ; Cloudflare मा यो नामको अरू production Worker छ भने पहिले नाम परिवर्तन गर्नुहोस्।

## Deployment सम्पन्न भएपछि

Terminal मा Cloudflare ले दिएको `https://vanshawali-360.<your-subdomain>.workers.dev` जस्तो वास्तविक URL खोल्नुहोस्। वास्तविक URL deploy नभएसम्म निश्चित हुँदैन। Chrome DevTools मा Home, Family Tree, Invitation Studio, mobile responsive view आदि जाँच गर्नुहोस्।

## GitHub बाट future auto-deploy

Cloudflare Dashboard → Workers & Pages → Create application → Connect to Git → GitHub repo छान्नुहोस्। Build settings हालको framework अनुसार विनिर्देश गर्नुहोस्। **यो repository मा Site-specific preview middleware छन्**; Cloudflare Workers deployment मा अझ परीक्षण चाहिन्छ। त्यसैले Cloudflare CLI को पहिलो manual deployment सफल भएपछि मात्र automatic deployment सक्षम पार्नुहोस्।

## महत्त्वपूर्ण सुरक्षा

- यो **Demo मात्र** हो, वास्तविक व्यक्तिगत/पारिवारिक गोप्य डेटा नहाल्नुहोस्।
- Real Login, backend authorization, tenant isolation, database तथा messaging endpoints हाल production-ready छैनन्।
- Cloudflare account को API token, password, secret key तथा access credential source code मा नराख्नुहोस्।
- RikshaMS र पुरानो preview site सँग सम्बन्ध नभएको नयाँ Worker मात्र प्रयोग गर्नुहोस्।

Cloudflare official: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
