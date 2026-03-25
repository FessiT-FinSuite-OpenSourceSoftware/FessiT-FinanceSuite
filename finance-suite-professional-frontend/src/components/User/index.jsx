import React from 'react'
import { Routes, Route } from 'react-router-dom'
import UsersList from './UsersList'
import UserCreation from './UserCreation'
import EditUser from './EditUser'

function index() {
  return (
    <Routes>
      <Route path="/" element={<UsersList />} />
      <Route path="/addUser" element={<UserCreation />} />
      <Route path="/editUser/:id" element={<EditUser />} />
    </Routes>
  )
}

export default index