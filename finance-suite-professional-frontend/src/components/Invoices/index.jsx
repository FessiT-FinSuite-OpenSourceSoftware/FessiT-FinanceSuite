import React, { useState } from 'react'
import InvoiceList from './InvoiceList'
import Invoice from './invoice'

export default function Index() {
  const [currentView, setCurrentView] = useState('list') // 'list' or 'edit'
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  if (currentView === 'edit') {
    return (
      <Invoice 
        invoiceId={selectedInvoiceId}
        onBack={() => setCurrentView('list')}
      />
    )
  }

  return (
    <InvoiceList 
      onCreateNew={() => setCurrentView('edit')}
      onEdit={(id) => {
        setSelectedInvoiceId(id)
        setCurrentView('edit')
      }}
    />
  )
}