import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { password } = await request.json();

    // Get current date in DDMMYYYY format (using India time as default, but server time works if predictable)
    // To be perfectly safe, let's format it explicitly in IST since it's Kerala plants
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // formatter returns "DD/MM/YYYY" format for en-IN
    const parts = formatter.formatToParts(new Date());
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    
    const expectedPassword = `${day}${month}${year}`;

    if (password === expectedPassword) {
      // Password is correct, read the JSON file and return it
      const jsonPath = path.join(process.cwd(), 'src', 'data', 'plants.json');
      const fileContents = fs.readFileSync(jsonPath, 'utf8');
      const plants = JSON.parse(fileContents);
      
      return NextResponse.json({ success: true, data: plants });
    } else {
      return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
