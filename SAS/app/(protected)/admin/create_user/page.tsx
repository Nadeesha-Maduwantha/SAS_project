'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const departmentRoles = ['salesuser', 'operationuser', 'superuser']

interface FormData {
  email: string
  password: string
  fullName: string
  age: number
  ethnicity: string
  role: string
  department: string
  address: string
  status?: string
  phone?: string
  joinDate?: string
  employeeId?: string
}

export default function CreateUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    age: 0,
    ethnicity: '',
    role: '',
    department: '',
    address: '',
  })

  // Browser autofill/history suggestions can set the input's value without
  // firing React's onChange (the native setter bypasses React's change
  // tracking), leaving formData.address stale even though the field looks
  // filled. A native 'input' listener catches those cases too.
  const addressRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = addressRef.current
    if (!el) return

    const syncAddress = () => {
      setFormData(prev => (prev.address === el.value ? prev : { ...prev, address: el.value }))
    }

    el.addEventListener('input', syncAddress)
    return () => el.removeEventListener('input', syncAddress)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'role' && !departmentRoles.includes(value) && { department: '' }),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://127.0.0.1:5000/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create user')
      }

      // Show success message
      setShowSuccess(true);

      // Reset the form so they can create another user.
      // Must match the FormData shape exactly — omitting a field (e.g. age,
      // ethnicity) makes its input flip from controlled to uncontrolled.
      setFormData({
        email: '',
        password: '',
        fullName: '',
        age: 0,
        ethnicity: '',
        role: '',
        department: '',
        address: '',
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred'
      console.log('Error details:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const showDepartment = departmentRoles.includes(formData.role)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Add New User</h1>
      </div>

      <p className="text-sm text-gray-500 mb-6">Registration of new team members in the system.</p>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          System Online
        </span>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="e.g. jonathan@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter secure password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="e.g. Jonathan Doe"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="25"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ethnicity</label>
              <select
                name="ethnicity"
                value={formData.ethnicity}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select option</option>
                <option value="asian">Asian</option>
                <option value="african">African</option>
                <option value="caucasian">Caucasian</option>
                <option value="hispanic">Hispanic</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="superuser">Super User</option>
                <option value="salesuser">Sales User</option>
                <option value="operationuser">Operation User</option>
              </select>
            </div>
          </div>

          {showDepartment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                <option value="sea">Sea</option>
                <option value="air">Air</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Residential Address</label>
            <input
              ref={addressRef}
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full street address, city, and zip code..."
              autoComplete="on"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : ' Create User'}
          </button>
        </div>
      </form>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">User created successfully!</h3>
            <p className="mt-1 text-sm text-gray-500">The new team member has been registered in the system.</p>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}