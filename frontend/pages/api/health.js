// Mock health endpoint for testing frontend connection
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ 
      status: 'healthy', 
      message: 'Mock backend is running',
      timestamp: new Date().toISOString()
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
