/**
 * Minimal example of how to call the analyze API from Next.js
 * This demonstrates the basic fetch pattern used in the application
 */

async function analyzeVideo(youtubeUrl: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeUrl: youtubeUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Analysis failed');
    }

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Error analyzing video:', error);
    throw error;
  }
}

// Example usage:
// const result = await analyzeVideo('https://www.youtube.com/watch?v=VIDEO_ID');
// console.log('Overall mood:', result.overall_mood);
// console.log('Timeline:', result.mood_timeline);





