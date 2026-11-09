
import apiClient from './apiClient'

// Get all locations belonging to the logged-in user
export const getQueues = async () => {
  const response = await apiClient.get('/queues')
  return response.data
}

// Add a new location
export const addLocation = async (location) => {
  const response = await apiClient.post('/locations', location)
  return response.data
}

// Update queue count
export const updateQueue = async (id, people) => {
  const response = await apiClient.put(
    `/locations/${id}/queue`,
    {
      people_waiting: people,
    }
  )

  return response.data
}

// Delete a location
export const deleteLocation = async (id) => {
  const response = await apiClient.delete(`/locations/${id}`)
  return response.data
}
export const getQueueHistory = async (locationId) => {
  const response = await apiClient.get(
    `/locations/${locationId}/history`
  )

  return response.data
}
export const downloadPDF = async (locationId) => {
  const response = await apiClient.get(
    `/locations/${locationId}/export/pdf`,
    { responseType: 'blob' }
  )

  return response.data
}

export const downloadExcel = async (locationId) => {
  const response = await apiClient.get(
    `/locations/${locationId}/export/excel`,
    { responseType: 'blob' }
  )

  return response.data
}