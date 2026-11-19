import TextField from '../TextField';
import { getCustomTextFields } from './templateFieldUtils';

/**
 * Value inputs for template customText fields — shown when generating certificates/marksheets.
 * Only the entered value is printed on the document; defaultValue is editor preview only.
 */
const CustomFieldsForm = ({ template, values = {}, onChange, documentType = 'certificate' }) => {
  const customFields = getCustomTextFields(template?.fields || []);

  if (!customFields.length) return null;

  const docLabel = documentType === 'marksheet' ? 'marksheet' : 'certificate';

  const handleChange = (fieldName, value) => {
    onChange?.({ ...values, [fieldName]: value });
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-950">Custom fields for {docLabel}</h3>
        <p className="text-xs text-amber-900/80 mt-1">
          Enter the text to print on the {docLabel}. You can type in Hindi, English, or any language.
        </p>
      </div>
      <div className="space-y-4">
        {customFields.map((field, index) => (
          <div
            key={field.fieldName}
            className="rounded-lg border border-amber-200/80 bg-white p-4 shadow-sm"
          >
            <label
              htmlFor={`custom-field-${field.fieldName}`}
              className="block text-sm font-medium text-gray-800 mb-1"
            >
              {field.label || (customFields.length > 1 ? `Custom field ${index + 1}` : 'Value to print')}
            </label>
            {field.defaultValue ? (
              <p className="text-xs text-gray-500 mb-2">
                Template preview example: <span className="font-medium text-gray-600">{field.defaultValue}</span>
              </p>
            ) : null}
            <TextField
              id={`custom-field-${field.fieldName}`}
              name={field.fieldName}
              value={values[field.fieldName] ?? ''}
              onChange={(e) => handleChange(field.fieldName, e.target.value)}
              placeholder="Enter value (Hindi / English / any language)"
              className="focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomFieldsForm;
