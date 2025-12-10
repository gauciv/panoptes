import { LucideIcon, Wallet, Image, Activity } from 'lucide-react';

export interface SubscriptionTemplate {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  eventType: string;
  config: {
    events: string[];
    description?: string;
    // Add other pre-filled fields as needed matching the subscription form
  };
}

export const SUBSCRIPTION_TEMPLATES: SubscriptionTemplate[] = [
  {
    id: 'wallet-monitor',
    title: 'Wallet Monitor',
    description: 'Track specific wallet transactions',
    icon: Wallet,
    eventType: 'Transaction',
    config: {
      events: ['transaction.inbound', 'transaction.outbound'],
      description: 'Wallet Activity Monitor',
    },
  },
  {
    id: 'nft-alerts',
    title: 'NFT Alerts',
    description: 'Monitor NFT mint events',
    icon: Image,
    eventType: 'NFT Mint',
    config: {
      events: ['nft.mint', 'nft.transfer'],
      description: 'NFT Collection Monitor',
    },
  },
  {
    id: 'defi-tracking',
    title: 'DeFi Tracking',
    description: 'Watch DeFi interactions',
    icon: Activity,
    eventType: 'Asset Move',
    config: {
      events: ['contract.interaction', 'token.swap'],
      description: 'DeFi Protocol Tracker',
    },
  },
];
