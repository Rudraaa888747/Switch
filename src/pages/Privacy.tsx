import React from 'react';
import { LegalPageTemplate } from '@/components/layout/LegalPageTemplate';

const Privacy = () => {
  return (
    <LegalPageTemplate
      title="Privacy Policy"
      lastUpdated="October 2023"
      sections={[
        {
          title: "Data Collection",
          content: (
            <>
              <p>At Switch, we respect your privacy. We collect only the information necessary to provide you with a premium shopping experience. This includes your name, contact details, delivery address, and browsing behavior on our platform.</p>
              <p>We do not store your payment card details. All transactions are securely processed by our certified payment partners.</p>
            </>
          )
        },
        {
          title: "How We Use Your Data",
          content: (
            <>
              <p>Your data is used to process orders, deliver your premium garments, and improve our platform's functionality. We may also use your email to notify you about order statuses, exclusive drops, and styling recommendations if you have opted in.</p>
            </>
          )
        },
        {
          title: "Information Sharing",
          content: (
            <>
              <p>We never sell your personal information to third parties. We share data only with trusted partners essential to fulfilling your order, such as logistics providers and secure payment gateways, under strict confidentiality agreements.</p>
            </>
          )
        },
        {
          title: "Your Rights",
          content: (
            <>
              <p>You have the right to access, modify, or request the deletion of your personal data at any time. You can manage your preferences directly from your Switch Profile or contact our support team for assistance.</p>
            </>
          )
        }
      ]}
    />
  );
};

export default Privacy;
