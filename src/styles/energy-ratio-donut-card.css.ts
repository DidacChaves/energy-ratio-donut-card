import { css } from 'lit'

export default css`
  ha-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    outline: 0;
  }

  .header {
    display: flex;
    padding: 16px 16px 0;
    justify-content: space-between;
  }

  .name {
    color: var(--secondary-text-color);
    line-height: 24px;
    margin-top: -10px;
    padding-top: 10px;
    padding-bottom: 16px;
    font-weight: 500;
    font-size: 16px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .period-info {
    font-size: 0.8em;
    color: var(--secondary-text-color);
  }

  .content {
    margin-top: -20px;
    padding: 0 10px 4px 10px;
  }

  .background {
    display: flex;
    flex-direction: row;
    border-radius: 10px;
    margin-top: 25px;
    margin-bottom: 25px;
    background-color: var(--token-color-background-secondary);
  }

  .left-column, .right-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    padding: 5px 0;
    width: 35%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .serie {
    font-size: 20px;
    color: var(--primary-text-color);
  }

  .serie span {
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  .serie-label {
    font-size: 10px;
    line-height: 15px;
    text-align: center;
    color: var(--secondary-text-color);
  }

  .serie-center {
    font-size: 22px;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding-top: 2px;
  }

  .serie-center.no-data {
    position: relative;
    background-color: var(--token-color-background-secondary);
    border-radius: 50%;
  }

  .serie-center.no-data::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 85%; /* Tamaño del círculo interior (70% del contenedor) */
    height: 85%;
    background-color: var(--card-background-color); /* Color diferente */
    border-radius: 50%;
    z-index: 1;
  }

  .center-column {
    display: flex;
    width: 30%;
    align-items: center;
    justify-content: center;
    background-color: var(--card-background-color);
    padding: 6px;
    margin-top: -25px;
    margin-bottom: -25px;
    border-radius: 50%;
  }

  .chart-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;
