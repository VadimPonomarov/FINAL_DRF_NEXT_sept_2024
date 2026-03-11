'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/modules/autoria/shared/hooks/use-toast'

interface ImageApiTesterProps {
  adId: string | number
}

export default function ImageApiTester({ adId }: ImageApiTesterProps) {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const testGetImages = async () => {
    setLoading(true)
    try {
      console.log(`🧪 Тестируем GET /api/autoria/cars/${adId}/images`)
      
      const response = await fetch(`/api/autoria/cars/${adId}/images?t=cache-bust`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      const data = await response.json()
      
      console.log('🧪 Результат GET:', data)
      setResult({ 
        type: 'GET', 
        status: response.status, 
        ok: response.ok,
        data,
        count: data.results?.length || data.length || 0
      })

      toast({
        title: response.ok ? "✅ GET успешно" : "❌ GET ошибка",
        description: `Статус: ${response.status}, Изображений: ${data.results?.length || data.length || 0}`,
        variant: response.ok ? "default" : "destructive",
      })
    } catch (error) {
      console.error('🧪 Ошибка GET:', error)
      setResult({ type: 'GET', error: (error instanceof Error ? error.message : String(error)) })
      toast({
        title: "❌ Ошибка сети",
        description: (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testAddImage = async () => {
    setLoading(true)
    try {
      const testImage = {
        image_url: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Test+Image',
        caption: 'Test Image',
        is_primary: false,
        order: 999
      }
      
      console.log(`🧪 Тестируем POST /api/autoria/cars/${adId}/images`, testImage)
      
      const response = await fetch(`/api/autoria/cars/${adId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testImage)
      })
      
      const data = await response.json()
      console.log('🧪 Результат POST:', data)
      setResult({ 
        type: 'POST', 
        status: response.status, 
        ok: response.ok,
        data 
      })

      toast({
        title: response.ok ? "✅ POST успешно" : "❌ POST ошибка",
        description: `Статус: ${response.status}`,
        variant: response.ok ? "default" : "destructive",
      })
    } catch (error) {
      console.error('🧪 Ошибка POST:', error)
      setResult({ type: 'POST', error: (error instanceof Error ? error.message : String(error)) })
      toast({
        title: "❌ Ошибка сети",
        description: (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testDeleteLastImage = async () => {
    // Сначала получаем список изображений
    try {
      const response = await fetch(`/api/autoria/cars/${adId}/images`)
      const data = await response.json()
      const images = data.results || data || []
      
      if (images.length === 0) {
        toast({
          title: "⚠️ Нет изображений",
          description: "Нет изображений для удаления",
          variant: "destructive",
        })
        return
      }

      const lastImage = images[images.length - 1]
      
      setLoading(true)
      console.log(`🧪 Тестируем DELETE /api/autoria/cars/${adId}/images/${lastImage.id}`)
      
      const deleteResponse = await fetch(`/api/autoria/cars/${adId}/images/${lastImage.id}`, {
        method: 'DELETE'
      })
      
      const deleteData = await deleteResponse.json().catch(() => ({}))
      console.log('🧪 Результат DELETE:', deleteData)
      setResult({ 
        type: 'DELETE', 
        status: deleteResponse.status, 
        ok: deleteResponse.ok,
        data: deleteData,
        deletedImageId: lastImage.id
      })

      toast({
        title: deleteResponse.ok ? "✅ DELETE успешно" : "❌ DELETE ошибка",
        description: `Статус: ${deleteResponse.status}, ID: ${lastImage.id}`,
        variant: deleteResponse.ok ? "default" : "destructive",
      })
    } catch (error) {
      console.error('🧪 Ошибка DELETE:', error)
      setResult({ type: 'DELETE', error: (error instanceof Error ? error.message : String(error)) })
      toast({
        title: "❌ Ошибка сети",
        description: (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800">🧪 Тестер API изображений (ID: {adId})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            onClick={testGetImages}
            disabled={loading}
            variant="outline"
            className="bg-white"
          >
            {loading ? 'Загрузка...' : '📥 GET изображения'}
          </Button>
          
          <Button
            onClick={testAddImage}
            disabled={loading}
            variant="outline"
            className="bg-white"
          >
            {loading ? 'Загрузка...' : '➕ POST добавить'}
          </Button>
          
          <Button
            onClick={testDeleteLastImage}
            disabled={loading}
            variant="outline"
            className="bg-white"
          >
            {loading ? 'Загрузка...' : '🗑️ DELETE последнее'}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-semibold mb-2">
              Результат {result.type}:
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {result.status || 'ERROR'}
              </span>
            </h4>
            <pre className="text-xs overflow-auto max-h-40 bg-gray-50 p-2 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
