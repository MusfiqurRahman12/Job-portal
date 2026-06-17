import { NextResponse } from 'next/server';
import Zernio from '@zernio/node';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.ZERNIO_API_KEY;
    const isSimulation = !apiKey || apiKey.includes('placeholder');

    if (isSimulation) {
      console.log(`[ZERNIO SIMULATION] Mocking upload for file: ${file.name}`);
      // Return a simulated premium mock image URL
      return NextResponse.json({
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'
      });
    }

    // Real Zernio Upload Flow
    const zernio = new Zernio({ apiKey });
    
    const response = await zernio.media.getMediaPresignedUrl({
      body: {
        filename: file.name,
        contentType: file.type as any,
        size: file.size
      }
    });

    if (response.error || !response.data?.uploadUrl || !response.data?.publicUrl) {
      return NextResponse.json({
        error: `Failed to request Zernio presigned URL: ${JSON.stringify(response.error || 'No URLs returned')}`
      }, { status: 400 });
    }

    const { uploadUrl, publicUrl } = response.data;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload directly to the presigned S3/Zernio URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      return NextResponse.json({
        error: `Failed to upload file to target bucket: ${text || uploadResponse.statusText}`
      }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 });
  }
}
