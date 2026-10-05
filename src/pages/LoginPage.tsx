import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Agent-First Architecture: No authentication lock or login barrier needed.
 * All traffic is routed directly to the Knowledge & Skill Marketplace.
 */
export const LoginPage: React.FC = () => {
  return <Navigate to="/library" replace />;
};
