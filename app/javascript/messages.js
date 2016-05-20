/* global angular */
const MESSAGE_TIMEOUTS = {message: 7000, success: 6000, error: 14000};

angular.module('dappChess').controller('MessagesCtrl', function ($scope) {
  $scope.messages = [];

  $scope.$on('message', function(event, message, type = message, topic = null) {
    let id = Math.random();

    if(topic) {
      $scope.messages = $scope.messages.filter(function(message) {
        if(topic === message.topic) {
          return false;
        }
        return true;
      });
    }
    if(type === 'success' || type === 'error') {
      setTimeout(function() {
        $scope.messages = $scope.messages.filter(function(message) {
          if(id === message.id) {
            return false;
          }
          return true;
        });
        $scope.$apply();
      }, MESSAGE_TIMEOUTS[type]);
    }

    $scope.messages.push({
      id: id,
      message: message,
      type: type,
      topic: topic
    });
  });
});
