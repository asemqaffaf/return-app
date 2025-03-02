/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import React, { Component } from 'react'
import { ContentWrapper } from 'vtex.my-account-commons'
import PropTypes from 'prop-types'
import { Spinner, Button } from 'vtex.styleguide'
import { injectIntl, defineMessages } from 'react-intl'
import { withRuntimeContext } from 'vtex.render-runtime'

import {
  productStatuses,
  returnFormDate,
  schemaNames,
  schemaTypes,
  prepareHistoryData,
  intlArea,
} from '../common/utils'
import RequestInfo from '../components/RequestInfo'
import StatusHistoryTable from '../components/StatusHistoryTable'
import ProductsTable from '../components/ProductsTable'
import { fetchHeaders, fetchMethod, fetchPath } from '../common/fetch'
import StatusHistoryTimeline from '../components/StatusHistoryTimeline'
import styles from '../styles.css'

const messages = defineMessages({
  notFound: { id: 'returns.requestNotFound' },
  returnForm: { id: 'returns.details.returnForm' },
  refOrder: { id: 'returns.refOrder' },
  status: { id: 'returns.status' },
  showLabel: { id: 'returns.showLabel' },
})

class ReturnsDetails extends Component<any, any> {
  static propTypes = {
    headerConfig: PropTypes.object,
    fetchApi: PropTypes.func,
  }

  constructor(props: any) {
    super(props)
    this.state = {
      loading: true,
      request: {},
      comment: [],
      product: [],
      statusHistory: [],
      statusHistoryTimeline: [],
      error: '',
      totalRefundAmount: 0,
      giftCardValue: 0,
      shippingLabel: '',
      totalShippingValue: 0,
      registeredUserId: '',
    }
  }

  async componentDidMount() {
    await this.getProfile()
    await this.getFullData()
  }

  async getFullData() {
    const requestId = this.props.match.params.id

    const request = await this.getFromMasterData(
      schemaNames.request,
      schemaTypes.requests,
      requestId
    )

    if (request[0].userId === this.state.registeredUserId) {
      if (request[0].giftCardId !== '') {
        this.getGiftCard(request[0].giftCardId).then()
      }

      this.setState({
        statusInput: request[0].status,
        commentInput: '',
        visibleInput: false,
        loading: false,
      })

      const response = await this.getProductsFromMasterData(
        request[0].orderId,
        requestId
      )

      let total = 0

      if (!response?.length) return

      response.forEach((currentProduct) => {
        total += currentProduct.quantity * currentProduct.unitPrice
      })

      const comments = await this.getFromMasterData(
        schemaNames.comment,
        schemaTypes.comments,
        requestId
      )

      this.setState({
        statusHistoryTimeline: prepareHistoryData(comments, request[0]),
        totalRefundAmount: total,
      })

      await this.getFromMasterData(
        schemaNames.history,
        schemaTypes.history,
        requestId
      )

      const orderResponse = await fetch(
        `${fetchPath.getOrder}${request[0].orderId}`
      )

      const order = await orderResponse.json()

      this.setState({
        totalShippingValue: (
          order.totals.find((orderTotal) => orderTotal.id === 'Shipping')
            .value / 100
        ).toFixed(2),
      })
    } else {
      this.setState({ request: '' })
    }

    this.setState({ loading: false })
  }

  async getProfile() {
    const { rootPath } = this.props.runtime
    const profileUrl = fetchPath.getProfile(rootPath)

    return fetch(profileUrl)
      .then((res) => res.json())
      .then((response) => {
        if (response.IsUserDefined) {
          this.setState({
            registeredUser: `${response.FirstName} ${response.LastName}`,
            registeredUserId: `${response.UserId}`,
          })
        }

        return Promise.resolve(response)
      })
  }

  async getGiftCard(id: any) {
    return fetch(`${fetchPath.getGiftCard}${id}`, {
      method: fetchMethod.get,
      headers: fetchHeaders,
    })
      .then((response) => response.json())
      .then((json) => {
        if ('balance' in json) {
          this.setState({ giftCardValue: json.balance })
        }
      })
      .catch((err) => this.setState({ error: err }))
  }

  async getFromMasterData(schema: string, type: string, refundId: string) {
    const isRequest = schema === schemaNames.request
    const whereField = isRequest ? 'id' : 'refundId'

    if (type === schemaTypes.comments) {
      refundId += '__visibleForCustomer=1'
    }

    return fetch(
      `${fetchPath.getDocuments + schema}/${type}/${whereField}=${refundId}`,
      {
        method: fetchMethod.get,
        headers: fetchHeaders,
      }
    )
      .then((response) => response.json())
      .then((json) => {
        this.setState({ [type]: isRequest ? json[0] : json })
        if (type === schemaTypes.products) {
          const productsForm: any = []

          json.forEach((currentProduct) => {
            let status = productStatuses.new

            if (currentProduct.goodProducts === 0) {
              status = productStatuses.denied
            } else if (currentProduct.goodProducts < currentProduct.quantity) {
              status = productStatuses.partiallyApproved
            } else if (
              currentProduct.goodProducts === currentProduct.quantity
            ) {
              status = productStatuses.approved
            }

            const updatedProduct = { ...currentProduct, status }

            productsForm.push(updatedProduct)
          })
          this.setState({
            productsForm,
            initialProductsForm: productsForm,
          })
        }

        return json
      })
      .catch((err) => this.setState({ error: err }))
  }

  async getProductsFromMasterData(orderId: string, returnId: string) {
    return fetch(
      `${fetchPath.getDocuments + schemaNames.product}/${
        schemaTypes.products
      }/orderId=${orderId}`,
      {
        method: fetchMethod.get,
        headers: fetchHeaders,
      }
    )
      .then((response) => response.json())
      .then((json) => {
        const refundableProducts = json.filter(
          (product) => product.refundId === returnId
        )

        this.setState({
          [schemaTypes.products]: refundableProducts,
        })
        const productsForm: any = []

        refundableProducts.forEach((currentProduct) => {
          let status = productStatuses.new

          if (currentProduct.goodProducts === 0) {
            status = productStatuses.denied
          } else if (currentProduct.goodProducts < currentProduct.quantity) {
            status = productStatuses.partiallyApproved
          } else if (currentProduct.goodProducts === currentProduct.quantity) {
            status = productStatuses.approved
          }

          const updatedProduct = { ...currentProduct, status }

          productsForm.push(updatedProduct)
        })

        this.setState({
          productsForm,
          initialProductsForm: productsForm,
        })

        return json
      })
      .catch((err) => this.setState({ error: err }))
  }

  render() {
    const {
      request,
      product,
      statusHistoryTimeline,
      statusHistory,
      loading,
      giftCardValue,
      totalShippingValue,
    } = this.state

    const { formatMessage } = this.props.intl

    return (
      <ContentWrapper {...this.props.headerConfig}>
        {() => {
          if (loading) {
            return (
              <div className="flex justify-center pt6 pb6">
                <Spinner />
              </div>
            )
          }

          if (!request) {
            return <div>{formatMessage({ id: messages.notFound.id })}</div>
          }

          return (
            <div>
              <p className={`${styles.requestInfoTitle}`}>
                <span className={`${styles.requestInfoTitleText}`}>
                  {formatMessage(
                    { id: messages.returnForm.id },
                    { requestId: ` #${request.id}` }
                  )}
                </span>
                <span className={`${styles.requestInfoTitleSeparator}`}>
                  {' '}
                  /{' '}
                </span>
                <span className={`${styles.requestInfoTitleDate}`}>
                  {returnFormDate(request.dateSubmitted)}
                </span>
              </p>
              <ProductsTable
                totalShippingValue={totalShippingValue}
                refundedShippingValue={request.refundedShippingValue}
                product={product}
                productsValue={request.totalPrice}
                totalRefundAmount={request.refundedAmount}
              />
              <p className={`mt7 ${styles.requestInfoOrder}`}>
                <strong className={`mr6 ${styles.requestInfoOrderText}`}>
                  {formatMessage(
                    { id: messages.refOrder.id },
                    { orderId: ` #${request.orderId}` }
                  )}
                </strong>
              </p>

              <RequestInfo giftCardValue={giftCardValue} request={request} />

              {request.returnLabel && (
                <div className="mt6">
                  <Button
                    href={request.returnLabel}
                    target="_blank"
                    variation="primary"
                  >
                    {formatMessage({ id: messages.showLabel.id })}
                  </Button>
                </div>
              )}

              <p className={`mt7 ${styles.requestInfoSectionTitle}`}>
                <strong className={`${styles.requestInfoSectionTitleStrong}`}>
                  {formatMessage({ id: messages.status.id })}
                </strong>
              </p>

              <StatusHistoryTimeline
                statusHistoryTimeline={statusHistoryTimeline}
                intlZone={intlArea.store}
              />
              <StatusHistoryTable statusHistory={statusHistory} />
            </div>
          )
        }}
      </ContentWrapper>
    )
  }
}

export default injectIntl(withRuntimeContext(ReturnsDetails))
