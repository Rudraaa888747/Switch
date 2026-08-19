import React from 'react';
import { LegalPageTemplate } from '@/components/layout/LegalPageTemplate';

const Refunds = () => {
  return (
    <LegalPageTemplate
      title="Refund Policy"
      lastUpdated="October 2023"
      sections={[
        {
          title: "Our Guarantee",
          content: (
            <>
              <p>We stand behind the premium quality of every Switch garment. If you are not completely satisfied with your purchase, we offer a seamless return and refund process within 14 days of delivery.</p>
            </>
          )
        },
        {
          title: "Conditions for Return",
          content: (
            <>
              <p>To be eligible for a return, the item must be unworn, unwashed, and in the exact condition you received it, with all original tags and premium packaging intact. Items showing signs of wear or damage will not be accepted.</p>
            </>
          )
        },
        {
          title: "Instant Wallet Refunds",
          content: (
            <>
              <p>To provide the fastest resolution possible, all approved refunds are credited instantly to your Switch Wallet once the returned item is scanned by our courier. You can use these credits immediately for your next purchase, or request a transfer to your original payment method (which may take 5-7 business days).</p>
            </>
          )
        },
        {
          title: "How to Initiate a Return",
          content: (
            <>
              <p>Simply navigate to your Orders in your Profile, select the item you wish to return, and follow the prompts. Our logistics partner will schedule a pickup at your convenience.</p>
            </>
          )
        }
      ]}
    />
  );
};

export default Refunds;
