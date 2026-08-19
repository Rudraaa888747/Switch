import React from 'react';
import { LegalPageTemplate } from '@/components/layout/LegalPageTemplate';

const Terms = () => {
  return (
    <LegalPageTemplate
      title="Terms of Use"
      lastUpdated="October 2023"
      sections={[
        {
          title: "Agreement to Terms",
          content: (
            <>
              <p>By accessing or using the Switch website, you agree to be bound by these Terms of Use. If you do not agree to all terms and conditions, you must not access our platform or use our services.</p>
            </>
          )
        },
        {
          title: "Intellectual Property",
          content: (
            <>
              <p>All content on this platform, including but not limited to designs, text, graphics, logos, images, and software, is the exclusive property of Switch or its licensors. You may not reproduce, distribute, or create derivative works without explicit written permission.</p>
            </>
          )
        },
        {
          title: "User Accounts",
          content: (
            <>
              <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion.</p>
            </>
          )
        },
        {
          title: "Pricing and Availability",
          content: (
            <>
              <p>All prices are subject to change without notice. We reserve the right to modify or discontinue any product. In the event a product is listed at an incorrect price, we reserve the right to refuse or cancel any orders placed for that product.</p>
            </>
          )
        }
      ]}
    />
  );
};

export default Terms;
