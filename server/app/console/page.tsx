import type { Metadata } from 'next'
import Console from '../Console'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

export const metadata: Metadata = { title: 'Console — DoorSignal' }

export default function ConsolePage() {
  return (
    <>
      <Navbar />
      <main className="app">
        <Console />
      </main>
      <Footer />
    </>
  )
}
