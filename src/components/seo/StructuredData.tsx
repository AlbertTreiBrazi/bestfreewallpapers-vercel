import React from 'react';
import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  schema: object | object[];
}

const StructuredData: React.FC<StructuredDataProps> = ({ schema }) => {
  const schemaArray = Array.isArray(schema) ? schema : [schema];
  
  return (
    <Helmet>
      {schemaArray.map((schemaObject, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaObject)
          }}
        />
      ))}
    </Helmet>
  );
};

export default StructuredData;