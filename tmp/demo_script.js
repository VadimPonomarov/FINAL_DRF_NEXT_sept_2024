// MCP Chrome DevTools Demo Script - FIXED VERSION
// Run this in Chrome DevTools Console to demonstrate avatar and car generation

console.log('🚀 Starting AutoRia Demo - Avatar & Car Generation (Fixed)');
console.log('=' .repeat(60));

// 1. Check Authentication Status
async function checkAuth() {
    console.log('\n🔐 1. Checking Authentication Status...');
    
    try {
        const response = await fetch('/api/auth/token');
        const data = await response.json();
        
        console.log('Auth response:', data);
        
        if (data.user) {
            console.log('✅ Authenticated as:', data.user.email || data.user.username);
            return true;
        } else {
            console.log('⚠️ Not authenticated - trying to login...');
            
            // Try to login
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@autoria.com',
                    password: '12345678'
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('✅ Login successful!');
                console.log('User:', loginData.user?.email);
                return true;
            } else {
                console.error('❌ Login failed:', await loginResponse.text());
                return false;
            }
        }
    } catch (error) {
        console.error('❌ Auth check failed:', error.message);
        return false;
    }
}

// 2. Test Avatar Generation (with proper authentication)
async function testAvatarGeneration() {
    console.log('\n📸 2. Testing Avatar Generation...');
    
    try {
        const response = await fetch('/api/user/profile/generate-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Important: include cookies
            body: JSON.stringify({
                first_name: 'Demo',
                last_name: 'User',
                age: 30,
                gender: 'neutral',
                style: 'realistic',
                custom_requirements: 'Professional portrait for demo'
            })
        });
        
        console.log('Avatar response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Avatar Generated Successfully!');
            console.log('📱 Avatar URL:', data.avatar_url);
            
            // Display avatar
            const img = document.createElement('img');
            img.src = data.avatar_url;
            img.style.cssText = 'width: 150px; height: 150px; border-radius: 50%; margin: 10px; border: 3px solid #4CAF50;';
            img.title = 'Generated Avatar - Click to open in new tab';
            img.onclick = () => window.open(data.avatar_url, '_blank');
            
            const container = document.createElement('div');
            container.style.cssText = 'margin: 20px 0; padding: 10px; border: 2px solid #4CAF50; border-radius: 8px; background: #f5f5f5;';
            const title = document.createElement('h3');
            title.textContent = '📸 Generated Avatar';
            title.style.cssText = 'color: #4CAF50; margin: 0 0 10px 0;';
            container.appendChild(title);
            container.appendChild(img);
            document.body.appendChild(container);
            
            console.log('🖼️ Avatar preview created - check page');
            return data.avatar_url;
        } else {
            const errorText = await response.text();
            console.error('❌ Avatar generation failed:', response.status);
            console.error('Error details:', errorText);
        }
    } catch (error) {
        console.error('❌ Avatar generation error:', error);
    }
    
    return null;
}

// 3. Test Car Image Generation (with proper authentication)
async function testCarGeneration() {
    console.log('\n🚗 3. Testing Car Image Generation...');
    
    try {
        const response = await fetch('/api/chat/generate-car-images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Important: include cookies
            body: JSON.stringify({
                car_data: {
                    brand: 'Tesla',
                    model: 'Model Y',
                    year: 2024,
                    color: 'red',
                    vehicle_type_name: 'SUV'
                },
                angles: ['front', 'side', 'rear'],
                style: 'realistic'
            })
        });
        
        console.log('Car response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Car Images Generated Successfully!');
            console.log(`📸 Generated ${data.images.length} images`);
            
            // Display car images
            const container = document.createElement('div');
            container.style.cssText = 'margin: 20px 0; padding: 10px; border: 2px solid #2196F3; border-radius: 8px; background: #f5f5f5;';
            
            const title = document.createElement('h3');
            title.textContent = '🚗 Generated Car Images (Tesla Model Y)';
            title.style.cssText = 'color: #2196F3; margin: 0 0 10px 0;';
            container.appendChild(title);
            
            data.images.forEach((img, index) => {
                const carImg = document.createElement('img');
                carImg.src = img.url;
                carImg.style.cssText = 'width: 200px; height: 150px; margin: 5px; border-radius: 4px; border: 2px solid #FF9800; cursor: pointer;';
                carImg.title = `${img.angle} view - Method: ${img.method || 'unknown'} - Click to open`;
                carImg.onclick = () => window.open(img.url, '_blank');
                container.appendChild(carImg);
            });
            
            document.body.appendChild(container);
            console.log('🖼️ Car images preview created - check page');
            return data.images;
        } else {
            const errorText = await response.text();
            console.error('❌ Car generation failed:', response.status);
            console.error('Error details:', errorText);
        }
    } catch (error) {
        console.error('❌ Car generation error:', error);
    }
    
    return null;
}

// 4. Main Demo Function
async function runDemo() {
    console.log('🎯 AutoRia Avatar & Car Generation Demo (Fixed)');
    console.log('🌐 Frontend:', window.location.origin);
    console.log('🔗 Backend: https://autoria-web-production.up.railway.app');
    
    // Check auth first
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
        console.log('\n⚠️ Authentication failed - some features may not work');
        console.log('🔗 Try manual login: /api/auth/signin');
    }
    
    // Run tests
    const avatarUrl = await testAvatarGeneration();
    const carImages = await testCarGeneration();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEMO RESULTS:');
    console.log('   Authentication:', isAuthenticated ? '✅ LOGGED IN' : '⚠️ AUTH ISSUES');
    console.log('   Avatar Generation:', avatarUrl ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Car Generation:', carImages ? `✅ SUCCESS (${carImages.length} images)` : '❌ FAILED');
    
    if (avatarUrl && carImages) {
        console.log('\n🎉 ALL SYSTEMS WORKING!');
        console.log('📱 Check the browser page for visual results');
        console.log('💡 Click on any image to open in new tab');
    } else {
        console.log('\n⚠️ Some systems need attention - check console errors above');
        console.log('🔧 Make sure you\'re logged in properly');
    }
    
    console.log('\n💡 Tips:');
    console.log('   - Generated images are displayed on the page');
    console.log('   - Click on images to open them in new tab');
    console.log('   - Avatar is displayed as a circular image');
    console.log('   - All images use G4F with no fallbacks');
    console.log('   - Authentication uses httpOnly cookies');
}

// Auto-run demo
runDemo();

// Export for manual testing
window.testDemo = {
    runDemo,
    testAvatarGeneration,
    testCarGeneration,
    checkAuth
};

console.log('\n💻 Demo functions loaded. You can also run manually:');
console.log('   testDemo.runDemo() - Full demo');
console.log('   testDemo.testAvatarGeneration() - Avatar only');
console.log('   testDemo.testCarGeneration() - Car images only');
console.log('   testDemo.checkAuth() - Check authentication status');
