import React, { Component } from "react";
import { ContentWrapper } from "vtex.my-account-commons";

import { PageProps } from "../typings/utils";
import {
  productStatuses,
  requestsStatuses,
  returnFormDate,
  schemaNames,
  schemaTypes,
  statusHistoryTimeline
} from "../common/utils";
import styles from "../styles.css";
import { IconCheck } from "vtex.styleguide";
import { FormattedMessage } from "react-intl";
import RequestInfoStore from "../components/RequestInfoStore";
import StatusHistoryTable from "../components/StatusHistoryTable";
import ProductsTableStore from "../components/ProductsTableStore";

class ReturnsDetails extends Component<PageProps, any> {
  constructor(props: PageProps) {
    super(props);
    this.state = {
      request: {},
      comment: [],
      product: [],
      statusHistory: [],
      statusHistoryTimeline: [],
      error: "",
      totalRefundAmount: 0
    };
  }

  componentDidMount(): void {
    this.getProfile().then();
    this.getFullData();
  }

  getFullData() {
    const requestId = this.props["match"]["params"]["id"];
    this.getFromMasterData(
      schemaNames.request,
      schemaTypes.requests,
      requestId
    ).then(request => {
      this.setState({
        statusInput: request[0].status,
        commentInput: "",
        visibleInput: false
      });
      this.getFromMasterData(
        schemaNames.product,
        schemaTypes.products,
        requestId
      ).then(response => {
        let total = 0;
        if (response.length) {
          response.map(currentProduct => {
            total += currentProduct.quantity * currentProduct.unitPrice;
          });
          this.setState({ totalRefundAmount: total });

          this.getFromMasterData(
            schemaNames.comment,
            schemaTypes.comments,
            requestId
          ).then(comments => {
            this.prepareHistoryData(comments, request[0]);
            this.getFromMasterData(
              schemaNames.history,
              schemaTypes.history,
              requestId
            ).then();
          });
        }
      });
    });
  }

  async getProfile() {
    return await fetch("/no-cache/profileSystem/getProfile")
      .then(response => response.json())
      .then(response => {
        if (response.IsUserDefined) {
          this.setState({
            registeredUser: response.FirstName + " " + response.LastName
          });
        }
        return Promise.resolve(response);
      });
  }

  async getFromMasterData(schema: string, type: string, refundId: string) {
    const isRequest = schema === schemaNames.request;
    const whereField = isRequest ? "id" : "refundId";

    if (type === schemaTypes.comments) {
      refundId += "__visibleForCustomer=1";
    }
    return await fetch(
      "/returns/getDocuments/" +
        schema +
        "/" +
        type +
        "/" +
        whereField +
        "=" +
        refundId,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    )
      .then(response => response.json())
      .then(json => {
        this.setState({ [type]: isRequest ? json[0] : json });
        if (type === schemaTypes.products) {
          const productsForm: any = [];
          json.map(currentProduct => {
            let status = productStatuses.new;
            if (currentProduct.goodProducts === 0) {
              status = productStatuses.denied;
            } else if (currentProduct.goodProducts < currentProduct.quantity) {
              status = productStatuses.partiallyApproved;
            } else if (
              currentProduct.goodProducts === currentProduct.quantity
            ) {
              status = productStatuses.approved;
            }
            const updatedProduct = { ...currentProduct, status: status };
            productsForm.push(updatedProduct);
          });
          this.setState({
            productsForm: productsForm,
            initialProductsForm: productsForm
          });
        }
        return json;
      })
      .catch(err => this.setState({ error: err }));
  }

  prepareHistoryData(comment: any, request: any) {
    const history = [
      {
        status: statusHistoryTimeline.new,
        step: 1,
        comments: comment.filter(item => item.status === requestsStatuses.new),
        active: 1
      },
      {
        status: statusHistoryTimeline.picked,
        step: 2,
        comments: comment.filter(
          item => item.status === requestsStatuses.pendingVerification
        ),
        active:
          request.status === requestsStatuses.pendingVerification ||
          request.status === requestsStatuses.partiallyApproved ||
          request.status === requestsStatuses.approved ||
          request.status === requestsStatuses.denied ||
          request.status === requestsStatuses.refunded
            ? 1
            : 0
      },
      {
        status: statusHistoryTimeline.verified,
        step: 3,
        comments: comment.filter(
          item =>
            item.status === requestsStatuses.partiallyApproved ||
            item.status === requestsStatuses.approved ||
            item.status === requestsStatuses.denied
        ),
        active:
          request.status === requestsStatuses.partiallyApproved ||
          request.status === requestsStatuses.approved ||
          request.status === requestsStatuses.denied ||
          request.status === requestsStatuses.refunded
            ? 1
            : 0
      },
      {
        status: statusHistoryTimeline.refunded,
        step: 4,
        comments: comment.filter(
          item => item.status === requestsStatuses.refunded
        ),
        active: request.status === requestsStatuses.refunded ? 1 : 0
      }
    ];
    this.setState({ statusHistoryTimeline: history });
  }

  render() {
    const {
      request,
      product,
      totalRefundAmount,
      statusHistoryTimeline,
      statusHistory
    } = this.state;
    return (
      <ContentWrapper {...this.props.headerConfig}>
        {() => {
          if (!request) {
            return <div>Not Found</div>;
          }
          return (
            <div>
              <p>
                <FormattedMessage
                  id={"store/my-returns.details.returnForm"}
                  values={{
                    requestId: " #" + request.id,
                    requestDate: " " + returnFormDate(request.dateSubmitted)
                  }}
                />
              </p>
              <ProductsTableStore
                product={product}
                totalRefundAmount={totalRefundAmount}
              />
              <p className={"mt7"}>
                <strong className={"mr6"}>
                  <FormattedMessage
                    id={"store/my-returns.refOrder"}
                    values={{ orderId: " #" + request.orderId }}
                  />
                </strong>
              </p>

              <RequestInfoStore request={request} />

              <p className={"mt7"}>
                <strong>
                  <FormattedMessage id={"store/my-returns.status"} />
                </strong>
              </p>

              <div>
                {statusHistoryTimeline.map((currentHistory, i) => (
                  <div key={`statusHistoryTimeline_` + i}>
                    <p className={styles.statusLine}>
                      {currentHistory.active ? (
                        <span
                          className={
                            styles.statusIcon + " " + styles.statusIconChecked
                          }
                        >
                          <IconCheck size={20} color={"#fff"} />
                        </span>
                      ) : (
                        <span className={styles.statusIcon} />
                      )}

                      {currentHistory.status === "new"
                        ? "Return form registered on " +
                          returnFormDate(request.dateSubmitted)
                        : currentHistory.status}
                    </p>
                    <ul
                      className={
                        styles.statusUl +
                        " " +
                        (statusHistoryTimeline.length === i + 1
                          ? styles.statusUlLast
                          : "")
                      }
                    >
                      {currentHistory.comments.map(comment => (
                        <li key={comment.id}>{comment.comment}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <StatusHistoryTable
                statusHistory={statusHistory}
                intlZone={"store/my-returns"}
              />
            </div>
          );
        }}
      </ContentWrapper>
    );
  }
}

export default ReturnsDetails;