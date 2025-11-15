# SmartGenEduX - Vercel Deployment Guide

## ✅ Production-Ready Package

Your SmartGenEduX ERP system is ready for Vercel deployment with complete email/password authentication, multi-tenant architecture, and VipuDevAI integration.

---

## 🚀 Quick Start

### Prerequisites
1. **GitHub Account** - For repository hosting
2. **Vercel Account** - Free tier works fine
3. **Neon Database** - Free tier with Singapore region
4. **OpenAI API Key** - For VipuDevAI features (optional)

### Step 1: Prepare Your Code

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - SmartGenEduX ERP"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Set Up Database (Neon - Singapore Region)

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project:
   - **Name**: SmartGenEduX Production
   - **Region**: **Asia Pacific (Singapore)** - ap-southeast-1
   - **Postgres Version**: 16 (latest)
3. Copy the **connection string** (format: `postgresql://user:password@host/database`)
4. Keep this ready for Vercel configuration

### Step 3: Deploy to Vercel

1. **Connect GitHub Repository**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Click "Import"

2. **Configure Build Settings**:
   - Framework Preset: Other
   - Build Command: `npm run build` (if needed, or leave default)
   - Output Directory: `dist/public`
   - Install Command: `npm install`

3. **Configure Environment Variables**:

Click "Environment Variables" and add the following:

#### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | Your Neon database connection string |
| `SESSION_SECRET` | `your-random-32-char-secret` | Generate using: `openssl rand -base64 32` |

#### Optional (Recommended for VipuDevAI)

| Variable | Value | Description |
|----------|-------|-------------|
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key for VipuDevAI |

#### Optional (Bootstrap Super Admin)

| Variable | Value | Description |
|----------|-------|-------------|
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@vipudev.com` | Super Admin email (default shown) |
| `BOOTSTRAP_ADMIN_PASSWORD` | `Admin123!` | Super Admin password (CHANGE IN PRODUCTION!) |
| `BOOTSTRAP_ADMIN_FIRST_NAME` | `Super` | First name |
| `BOOTSTRAP_ADMIN_LAST_NAME` | `Admin` | Last name |

   **Generating SESSION_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

### Step 4: Set Up Database

After first deployment, push your database schema:

1. **Install Drizzle Kit locally**:
   ```bash
   npm install -g drizzle-kit
   ```

2. **Set DATABASE_URL in your local environment**:
   ```bash
   export DATABASE_URL="<your-postgresql-url>"
   ```

3. **Push schema to database**:
   ```bash
   npm run db:push
   ```

### Step 5: First Login

1. Navigate to your Vercel deployment URL
2. Login with your bootstrap credentials:
   - **Email**: admin@vipudev.com (or your custom BOOTSTRAP_ADMIN_EMAIL)
   - **Password**: Admin123! (or your custom BOOTSTRAP_ADMIN_PASSWORD)
3. **IMPORTANT**: Immediately change your password after first login!

### Automatic Deployments

Vercel automatically deploys when you push to your GitHub repository:

```bash
git add .
git commit -m "Update feature"
git push
```

## 🔐 Security Checklist

Before going live:

- [ ] Change default Super Admin password
- [ ] Use a strong SESSION_SECRET (min 32 characters)
- [ ] Enable Vercel environment variable encryption
- [ ] Configure custom domain with HTTPS (Vercel provides this automatically)
- [ ] Backup your DATABASE_URL securely (password manager)
- [ ] Set up Neon database backups

## 🏗️ Architecture Overview

### Authentication System
- **Type**: Email/Password with JWT
- **Access Tokens**: 15-minute expiry (HS512 signed)
- **Refresh Tokens**: 7-day expiry (A256GCM encrypted)
- **Storage**: HttpOnly secure cookies
- **Revocation**: Database-backed token validation
- **Rotation**: Automatic token rotation with counter

### Security Features
✅ Bcrypt password hashing (cost 10)  
✅ Login rate limiting (5/15min)  
✅ HttpOnly secure cookies (XSS prevention)  
✅ HTTPS enforced in production  
✅ Parameterized SQL queries (injection prevention)  
✅ No public registration (admin creates users)  
✅ Multi-tenant data isolation  

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | ✅ Yes | PostgreSQL connection string |
| SESSION_SECRET | ✅ Yes | Secret key for JWT signing and JWE encryption (32+ chars) |
| OPENAI_API_KEY | 📝 Optional | OpenAI API key for VipuDevAI |
| ANTHROPIC_API_KEY | 📝 Optional | Alternative to OpenAI |
| GEMINI_API_KEY | 📝 Optional | Alternative to OpenAI |
| BOOTSTRAP_ADMIN_* | 📝 Optional | Bootstrap credentials (auto-creates Super Admin) |

## Troubleshooting

### Issue: "Unauthorized" errors
**Solution**: Check that SESSION_SECRET is set and REPL_ID matches your domain

### Issue: AI not responding
**Solution**: Verify ANTHROPIC_API_KEY is set correctly in Vercel environment variables

### Issue: Database connection errors
**Solution**: 
- Verify DATABASE_URL is correct
- Check if database allows connections from Vercel IPs
- For Neon: Enable "Pooled connection" option
- Make sure schema is pushed with `npm run db:push`

### Issue: VipuDev.AI not visible
**Solution**: 
- Verify your user role is set to 'super_admin' in database
- Log out and log back in
- Clear browser cache

### Issue: Build fails on Vercel
**Solution**:
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Try deploying from a clean branch

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Login/logout works
- [ ] Database connection is stable
- [ ] At least one user has super_admin role
- [ ] VipuDev.AI is accessible to super admin
- [ ] Can create conversations with AI
- [ ] Can create new modules
- [ ] Environment variables are set
- [ ] Custom domain configured (if applicable)

## Monitoring & Maintenance

### Vercel Dashboard
- Monitor deployment status
- View application logs
- Track performance metrics
- Configure alerts

### Database Monitoring
- Monitor connection pool usage
- Check for slow queries
- Regular backups recommended

### AI Usage Monitoring
- Track API usage in Anthropic dashboard
- Monitor costs
- Set usage limits if needed

## Security Recommendations

1. **Use strong SESSION_SECRET** (32+ random characters)
2. **Enable HTTPS** (automatic on Vercel)
3. **Regularly rotate API keys**
4. **Monitor user access** and role assignments
5. **Keep dependencies updated**: `npm update`
6. **Review logs** for suspicious activity

## Scaling Considerations

As your school grows:

1. **Database**: Upgrade to larger Neon/Supabase plan
2. **Vercel**: Move to Pro plan for better performance
3. **AI**: Monitor token usage, consider caching responses
4. **CDN**: Enable Vercel Edge Network for static assets

## Getting Help

- **Replit**: Replit Community Forum
- **Vercel**: Vercel Support & Documentation
- **Database**: Neon/Supabase support
- **AI**: Anthropic documentation

## Cost Estimates

### Free Tier (Suitable for testing)
- Vercel: Free (hobby plan)
- Neon Database: Free (0.5GB)
- Anthropic: Pay-as-you-go (~$0.003 per request)

### Production (Medium school ~500 users)
- Vercel Pro: ~$20/month
- Neon Database: ~$20-50/month
- Anthropic API: ~$50-100/month
- **Total**: ~$100-200/month

---

**Ready to deploy?** Follow the steps above and your SmartGenEduX ERP will be live in minutes!
