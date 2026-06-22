import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import NotFound from './components/NotFound'
import Layout from './components/Layout'
import Candidates from './components/Candidates'
import RecruitmentPipeline from './components/RecruitmentPipeline'
import RecruitmentManagers from './components/RecruitmentManagers'
import MyCandidates from './components/MyCandidates'
import ManagerCandidateData from './components/ManagerCandidateData'
import ManagerOrders from './components/ManagerOrders'
import RecruitmentOrders from './components/RecruitmentOrders'
import RecruitmentOrderPipeline from './components/RecruitmentOrderPipeline'
import RecruitmentReport from './components/RecruitmentReport'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes inside Layout */}
        <Route path="/home" element={<Layout><Dashboard /></Layout>} />
        <Route path="/recruitment/candidates" element={<Layout><Candidates /></Layout>} />
        <Route path="/recruitment/my-candidates" element={<Layout><MyCandidates /></Layout>} />
        <Route path="/recruitment/my-candidate" element={<Navigate to="/recruitment/my-candidates" replace />} />
        <Route path="/recruitment/manager-candidate-data" element={<Layout><ManagerCandidateData /></Layout>} />
        <Route path="/recruitment/candidate-data" element={<Navigate to="/recruitment/manager-candidate-data" replace />} />
        <Route path="/recruitment/pipeline" element={<Layout><RecruitmentPipeline /></Layout>} />
        <Route path="/recruitment/managers" element={<Layout><RecruitmentManagers /></Layout>} />
        
        <Route path="/recruitment/manager-orders" element={<Layout><ManagerOrders /></Layout>} />
        <Route path="/recruitment/assigned-orders" element={<Layout><ManagerOrders /></Layout>} />
        <Route path="/recruitment/orders/manager" element={<Layout><ManagerOrders /></Layout>} />

        <Route path="/recruitment/orders" element={<Layout><RecruitmentOrders /></Layout>} />
        <Route path="/recruitment/recruitment-orders" element={<Layout><RecruitmentOrders /></Layout>} />
        <Route path="/recruitment/order-management" element={<Layout><RecruitmentOrders /></Layout>} />
        <Route path="/recruitment/orders/management" element={<Layout><RecruitmentOrders /></Layout>} />

        <Route path="/recruitment/order-pipeline" element={<Layout><RecruitmentOrderPipeline /></Layout>} />
        <Route path="/recruitment/orders/pipeline" element={<Layout><RecruitmentOrderPipeline /></Layout>} />
        <Route path="/recruitment/orders/process" element={<Layout><RecruitmentOrderPipeline /></Layout>} />
        <Route path="/recruitment/orders/workflow" element={<Layout><RecruitmentOrderPipeline /></Layout>} />

        <Route path="/recruitment/report" element={<Layout><RecruitmentReport /></Layout>} />

        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

