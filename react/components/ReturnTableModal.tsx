import React from 'react'
import { FormattedMessage } from 'react-intl'
import { FormattedCurrency } from 'vtex.format-currency'
import { Modal } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

const CSS_HANDLES = ['table', 'tableModal'] as const

type ReturnTableModalProps = {
  selectedRequestProducts: any[]
  handleModalToggle: () => void
  isModalOpen: boolean
}
const ReturnTableModal = ({
  selectedRequestProducts,
  isModalOpen,
  handleModalToggle,
}: ReturnTableModalProps) => {
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <Modal centered isOpen={isModalOpen} onClose={handleModalToggle}>
      <div className="dark-gray">
        {selectedRequestProducts.length ? (
          <table className={`${handles.table} ${handles.tableModal}`}>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="returns.skuId" />
                </th>
                <th>
                  <FormattedMessage id="returns.product" />
                </th>
                <th>
                  <FormattedMessage id="returns.unitPrice" />
                </th>
                <th>
                  <FormattedMessage id="returns.quantity" />
                </th>
                <th>
                  <FormattedMessage id="returns.price" />
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedRequestProducts.map((product: any) => (
                <tr key={product.skuId}>
                  <td>{product.skuId}</td>
                  <td>{product.skuName}</td>
                  <td>
                    <FormattedCurrency value={product.unitPrice / 100} />
                  </td>
                  <td>{product.quantity}</td>
                  <td>
                    <FormattedCurrency value={product.totalPrice / 100} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </Modal>
  )
}

export { ReturnTableModal }
