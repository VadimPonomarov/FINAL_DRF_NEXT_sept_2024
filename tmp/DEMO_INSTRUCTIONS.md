# 🎬 AutoRia Avatar & Car Generation Demo Instructions

## 🚀 Quick Start Demo

### 1. Open Frontend
```
🌐 URL: https://autoria-clone.vercel.app
```

### 2. Login (Required for full functionality)
```
📧 Email: admin@autoria.com
🔑 Password: 12345678
```

### 3. Chrome DevTools Demo
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Copy and paste the demo script from `tmp/demo_script.js`
4. Press Enter to run

## 📸 What the Demo Shows

### Avatar Generation
- ✅ Uses G4F with flux model + Pollinations provider
- ✅ Generates professional portrait based on profile data
- ✅ No fallback - pure G4F implementation
- ✅ Circular avatar display on page

### Car Image Generation  
- ✅ Uses G4F with dall-e-3 model + OpenaiChat provider
- ✅ Generates multiple angles (front, side, rear)
- ✅ Consistent styling across all angles
- ✅ No fallback - pure G4F implementation
- ✅ Images displayed in grid layout

## 🔧 Technical Details

### Avatar System
- **Model**: flux
- **Provider**: Pollinations  
- **Size**: 1024x1024
- **Style**: Realistic professional portrait
- **Retry**: 3 attempts with 30s timeout

### Car System
- **Model**: dall-e-3
- **Provider**: OpenaiChat
- **Size**: 1024x1024 per image
- **Angles**: Multiple views with session consistency
- **Retry**: 3 attempts with 30s timeout

## 🎯 Expected Results

### Success Indicators
```
✅ Avatar Generation: SUCCESS
✅ Car Generation: SUCCESS (3 images)  
✅ Authentication: LOGGED IN
🎉 ALL SYSTEMS WORKING!
```

### Visual Results
- 🖼️ Circular avatar image appears on page
- 🚗 3 car images appear in styled container
- 📱 All images are clickable and show details on hover

## 🐛 Troubleshooting

### If Avatar Fails
- Check authentication status
- Verify backend connectivity
- Look for G4F import errors

### If Car Images Fail  
- Verify dall-e-3 model availability
- Check OpenaiChat provider access
- Review prompt formatting

### If Both Fail
- Check Railway backend status
- Verify environment variables
- Review G4F library installation

## 📊 Performance Metrics

### Response Times
- Avatar generation: ~5-15 seconds
- Car generation: ~10-30 seconds (3 images)
- Authentication: ~1-2 seconds

### Quality Indicators
- High resolution (1024x1024)
- Professional styling
- Consistent results
- No watermark/logo

## 🔗 Direct API Testing

You can also test endpoints directly:

### Avatar Generation
```bash
curl -X POST https://autoria-web-production.up.railway.app/api/users/profile/generate-avatar \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Demo","age":30,"gender":"neutral","style":"realistic"}'
```

### Car Generation
```bash
curl -X POST https://autoria-web-production.up.railway.app/api/chat/generate-car-images \
  -H "Content-Type: application/json" \
  -d '{"car_data":{"brand":"Tesla","model":"Model Y","year":2024},"angles":["front","side"]}'
```

## 🎉 Demo Complete!

When you see:
- ✅ Avatar displayed as circular image
- ✅ 3 car images in styled container  
- ✅ Console shows "ALL SYSTEMS WORKING!"

Then the demo is successful and both avatar and car generation are working perfectly with G4F!
