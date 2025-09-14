import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthManager } from '@/utils/auth/serverAuth';

export async function GET(request: NextRequest) {
  try {
    console.log('[User Profile API] 📤 GET request received');

    // Check if user is authenticated
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    if (!isAuthenticated) {
      console.log('[User Profile API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Use ServerAuthManager to make authenticated request with automatic token refresh
    console.log('[User Profile API] 🔄 Fetching profile data from backend...');
    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/users/profile/`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const profileData = await response.json();
    console.log('[User Profile API] ✅ Profile data fetched successfully');
    return NextResponse.json(profileData);

  } catch (error) {
    console.error('[User Profile API] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  console.log('==================================================');
  console.log('[User Profile API] 🚀 PATCH FUNCTION ENTRY POINT!');
  console.log('==================================================');

  try {
    console.log('[User Profile API] 🚀 PATCH request received!');

    // Check if user is authenticated
    console.log('[User Profile API] 🔍 Checking authentication...');
    const isAuthenticated = await ServerAuthManager.isAuthenticated(request);
    console.log('[User Profile API] 🔍 Authentication result:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('[User Profile API] ❌ User not authenticated');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[User Profile API] ✅ User authenticated successfully');

    const requestData = await request.json();
    console.log('[User Profile API] 📝 Request data received:', JSON.stringify(requestData, null, 2));

    // Check for avatar_url in different possible locations
    const avatarUrl = requestData.profile?.avatar_url || requestData.profile?.profile?.avatar_url;
    if (avatarUrl) {
      console.log('[User Profile API] ✅ Avatar URL found in request:', avatarUrl);
    } else {
      console.log('[User Profile API] ⚠️ No avatar_url in request data');
      console.log('[User Profile API] 🔍 Request structure:', {
        hasProfile: !!requestData.profile,
        profileKeys: requestData.profile ? Object.keys(requestData.profile) : [],
        hasNestedProfile: !!requestData.profile?.profile,
        nestedProfileKeys: requestData.profile?.profile ? Object.keys(requestData.profile.profile) : []
      });
    }

    // Fix the nested structure if needed
    if (requestData.profile?.profile && !requestData.profile.name) {
      console.log('[User Profile API] 🔧 Fixing nested profile structure...');
      requestData.profile = requestData.profile.profile;
      console.log('[User Profile API] 🔧 Fixed structure:', JSON.stringify(requestData, null, 2));
    }

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // First, try to get existing profile
    console.log('[User Profile API] 🔍 Checking if profile exists...');
    const getResponse = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/users/profile/`,
      {
        method: 'GET'
      }
    );

    let method = 'PATCH';
    let profileExists = false;
    let needsFullSetup = false;

    if (getResponse && getResponse.ok) {
      const existingProfile = await getResponse.json();
      if (existingProfile && existingProfile.profile) {
        console.log('[User Profile API] ✅ Profile exists, will update');
        profileExists = true;
      }
    } else {
      console.log('[User Profile API] 🆕 Profile does not exist, will create full setup');
      method = 'POST';
      needsFullSetup = true;
    }

    // If we need full setup, we should also create account and address
    if (needsFullSetup) {
      console.log('[User Profile API] 🏗️ Will create Profile → Account → Address chain');
    }

    // Use ServerAuthManager to make authenticated request
    console.log('[User Profile API] 🔄 Sending to backend...');
    console.log('[User Profile API] 📤 Backend URL:', `${backendUrl}/api/users/profile/`);
    console.log('[User Profile API] 🔧 Method:', method);
    console.log('[User Profile API] 📤 Request body:', JSON.stringify(requestData, null, 2));

    // Final check for avatar_url before sending
    if (requestData.profile?.avatar_url) {
      console.log('[User Profile API] 🎯 FINAL CHECK: avatar_url is present:', requestData.profile.avatar_url);
    } else {
      console.log('[User Profile API] ❌ FINAL CHECK: avatar_url is missing!');
    }

    const response = await ServerAuthManager.authenticatedFetch(
      request,
      `${backendUrl}/api/users/profile/`,
      {
        method: method,
        body: JSON.stringify(requestData)
      }
    );

    console.log('[User Profile API] 📥 Backend response status:', response.status);
    console.log('[User Profile API] 📥 Backend response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[User Profile API] ❌ Backend error:', response.status);
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const updatedProfileData = await response.json();
    console.log('[User Profile API] ✅ Profile updated successfully');
    console.log('[User Profile API] 📤 Response from backend:', JSON.stringify(updatedProfileData, null, 2));

    // If this was a new profile creation, also create account and address
    if (needsFullSetup && method === 'POST') {
      console.log('[User Profile API] 🏗️ Creating account and address for new user...');

      try {
        // Create account
        console.log('[User Profile API] 📝 Creating account...');
        const accountResponse = await ServerAuthManager.authenticatedFetch(
          request,
          `${backendUrl}/api/users/account/`,
          {
            method: 'POST',
            body: JSON.stringify({
              account_type: 'basic',
              moderation_level: 'auto',
              role: 'seller',
              organization_name: '',
              stats_enabled: false
            })
          }
        );

        if (accountResponse && accountResponse.ok) {
          console.log('[User Profile API] ✅ Account created successfully');

          // Create address
          console.log('[User Profile API] 📍 Creating address...');
          const addressResponse = await ServerAuthManager.authenticatedFetch(
            request,
            `${backendUrl}/api/users/addresses/`,
            {
              method: 'POST',
              body: JSON.stringify({
                input_region: 'Київська область',
                input_locality: 'Київ'
              })
            }
          );

          if (addressResponse && addressResponse.ok) {
            console.log('[User Profile API] ✅ Address created successfully');
          } else {
            console.log('[User Profile API] ⚠️ Address creation failed, but profile and account were created');
          }
        } else {
          console.log('[User Profile API] ⚠️ Account creation failed, but profile was created');
        }
      } catch (setupError) {
        console.error('[User Profile API] ⚠️ Error during full setup:', setupError);
        console.log('[User Profile API] ℹ️ Profile was created successfully, but account/address setup failed');
      }
    }

    return NextResponse.json(updatedProfileData);

  } catch (error) {
    console.error('[User Profile API] ❌ Error in PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
