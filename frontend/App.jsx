import React from 'react';
import '@shopify/polaris/build/esm/styles.css';
import { AppProvider, Card, Page, Text, Button } from '@shopify/polaris';

export default function App() {
  return (
    <AppProvider i18n={{}}>
      <Page title="Discount Countdown Timer">
        <Card sectioned>
          <Text variant="headingLg" as="h1">
            Welcome to the Discount Countdown Timer App
          </Text>
          <Text as="p" variant="bodyMd">
            Create urgency and boost sales by showing a countdown timer for your discounts!
          </Text>
          <Button primary>Get Started</Button>
        </Card>
      </Page>
    </AppProvider>
  );
} 