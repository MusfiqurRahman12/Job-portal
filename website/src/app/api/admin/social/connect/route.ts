import { NextResponse } from 'next/server';
import Zernio from '@zernio/node';

export async function POST(req: Request) {
  try {
    const { platform } = await req.json();

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    const apiKey = process.env.ZERNIO_API_KEY;

    // Fallback Simulation Mode if no API Key is set or if platform is truthsocial
    if (!apiKey || apiKey.includes('placeholder') || platform === 'truthsocial') {
      console.log(`[ZERNIO SIMULATION] Generating connection link for platform: ${platform}`);
      // Return a simulated hosted OAuth URL that mocks connection
      return NextResponse.json({
        url: `https://zernio.com/oauth/simulate?platform=${encodeURIComponent(platform)}&success=true`
      });
    }

    const zernio = new Zernio({ apiKey });
    
    // Fetch profiles to get profileId required for connection
    const profilesRes = await zernio.profiles.listProfiles();
    const profiles = (profilesRes.data?.profiles || []) as any[];
    const profileId = profiles.find((p: any) => p.isDefault)?._id || profiles[0]?._id;

    if (!profileId) {
      return NextResponse.json({ error: 'No profiles found in your Zernio account.' }, { status: 400 });
    }

    const response = await zernio.connect.getConnectUrl({
      path: { platform: platform as any },
      query: { profileId }
    });

    if (response.error) {
      return NextResponse.json({ error: `Zernio Error: ${JSON.stringify(response.error)}` }, { status: 400 });
    }

    return NextResponse.json({ url: response.data?.authUrl || '' });
  } catch (err: any) {
    console.error('Zernio Connect Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to initiate platform connection' }, { status: 500 });
  }
}

